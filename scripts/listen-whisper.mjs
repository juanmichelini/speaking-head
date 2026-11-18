// # Listening with Whisper: render the phrases for the intelligibility test
//
// Pitch and formant tracking (`scripts/listen.mjs`) say whether a note is on pitch and a vowel has the right
// formants. They cannot say whether a listener would *understand* the word. A speech recogniser can, roughly:
// give it the audio and the language, and the words it writes down, set against the words we meant, are a
// score. Where the transcript is wrong, some sound did not come out as the sound it was meant to be.
//
// This script is only the Node half. It renders, for each language, the sample phrase of its dictionary
// (`lib/languages.js`) spoken through the whole pipeline (`lib/pipeline.js`), and Happy Birthday sung
// (`lib/songs.js`), and writes each as a WAV file with a `manifest.json` that says what each file was meant to
// say. `tools/listening/whisper_wer.py` reads that manifest, transcribes the files and prints the word error
// rate. The recogniser needs Python packages and model weights, so it is kept out of `npm test` and out of CI;
// see `tools/listening/README.md`.
//
// ## What the recogniser is shown to expect
//
// The dictionaries spell some phrases in Latin letters (`ni3hao3`, `namaste`, `nomoshkar`), which is how we type
// them but not how Whisper writes them. So every phrase carries a `reference`: the same words in the language's
// own script, which is what a correct transcript would look like. The songs' lyrics are IPA, so they carry a
// reference spelled the usual way.
//
// Usage: `node scripts/listen-whisper.mjs [--langs en,es] [--voice woman] [--bpm 100] [--out out/listening]`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGUAGES, parseDictionary } from '../lib/languages.js';
import { speakText } from '../lib/pipeline.js';
import { voiceById } from '../lib/voices.js';
import { sing, parseNotes } from '../lib/melody.js';
import { songFor } from '../lib/songs.js';
import { renderScore, encodeWav } from '../lib/render.js';

// ## The words each phrase should come back as
const SPEECH_REFERENCE = {
  en: 'hello world', es: 'hola mundo', zh: '你好', hi: 'नमस्ते', ar: 'مرحبا سلام',
  fr: 'bonjour le monde', bn: 'নমস্কার', pt: 'olá mundo', ru: 'привет мир', id: 'halo dunia',
};

const SONG_REFERENCE = {
  en: 'Happy birthday to you. Happy birthday to you. Happy birthday dear Mary. Happy birthday to you.',
  es: 'Cumpleaños feliz. Cumpleaños feliz. Te deseamos todos. Cumpleaños feliz.',
  fr: 'Joyeux anniversaire. Joyeux anniversaire. Joyeux anniversaire Marie. Joyeux anniversaire.',
  pt: 'Parabéns pra você. Nesta data querida. Muitas felicidades. Muitos anos de vida.',
  id: 'Selamat ulang tahun. Selamat ulang tahun. Selamat panjang umur. Selamat ulang tahun.',
  ru: 'С днём рождения тебя. С днём рождения тебя. С днём рождения, Маша. С днём рождения тебя.',
  zh: '祝你生日快乐。祝你生日快乐。祝你生日快乐。祝你生日快乐。',
  hi: 'जन्मदिन मुबारक हो। जन्मदिन मुबारक हो। जन्मदिन मुबारक हो। जन्मदिन मुबारक हो।',
  bn: 'শুভ জন্মদিন। শুভ জন্মদিন। শুভ জন্মদিন তোমাকে। শুভ জন্মদিন।',
  ar: 'عيد ميلاد سعيد. عيد ميلاد سعيد. عيد ميلاد سعيد. عيد ميلاد سعيد.',
};

// ## Reading the options
function options(argv) {
  const out = { langs: LANGUAGES.map((l) => l.code), voice: 'woman', bpm: 100, out: 'out/listening' };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!(key in out)) throw new Error(`unknown option ${argv[i]}`);
    out[key] = key === 'langs' ? argv[i + 1].split(',') : key === 'bpm' ? Number(argv[i + 1]) : argv[i + 1];
  }
  return out;
}

// ## Rendering
const SAMPLE_RATE = 44100;
const opts = options(process.argv.slice(2));
const voice = voiceById(opts.voice);
if (!voice) throw new Error(`no voice called ${opts.voice}`);
mkdirSync(opts.out, { recursive: true });

const manifest = [];
const save = (id, language, kind, text, reference, samples) => {
  const wav = join(opts.out, `${id}.wav`);
  writeFileSync(wav, Buffer.from(encodeWav(samples, SAMPLE_RATE)));
  manifest.push({ id, language, kind, text, reference, wav, seconds: samples.length / SAMPLE_RATE });
  console.log(`${id.padEnd(10)} ${(samples.length / SAMPLE_RATE).toFixed(1).padStart(5)} s  ${wav}`);
};

for (const code of opts.langs) {
  const language = LANGUAGES.find((l) => l.code === code);
  if (!language) throw new Error(`no language called ${code}`);
  const entries = parseDictionary(readFileSync(new URL(`../data/dictionaries/${code}.tsv`, import.meta.url), 'utf8'));

  const said = speakText(language.sample, { entries, language, voice });
  const unknown = said.words.filter((w) => !w.ipa).map((w) => w.word);
  if (unknown.length) throw new Error(`${code}: the dictionary does not know ${unknown.join(', ')}`);
  save(`${code}-speech`, code, 'speech', language.sample, SPEECH_REFERENCE[code],
    renderScore(said.score, { sampleRate: SAMPLE_RATE, tractLength: said.tractLength }));

  const { text, notes } = songFor(code);
  // As the singing lesson does: the voice gives the base pitch and the quality, the notes give the rest.
  const song = sing(text, parseNotes(notes), {
    bpm: opts.bpm, f0: voice.f0, tenseness: voice.tenseness, vibratoDepth: voice.vibratoDepth, jitter: voice.jitter,
  });
  save(`${code}-song`, code, 'song', text, SONG_REFERENCE[code],
    renderScore(song.score, { sampleRate: SAMPLE_RATE, tractLength: voice.tractCm }));
}
writeFileSync(join(opts.out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`manifest: ${join(opts.out, 'manifest.json')}`);
