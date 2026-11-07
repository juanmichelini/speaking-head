// # Lesson 9: Everything
//
// The capstone: every stage of the chain at once. Type text, choose a language, an accent, a rhythm, a speed, a
// sentence melody (statement or question) and a voice, and hear it. This page does no work of its own: `speakText` in `lib/pipeline.js` calls lesson 4 (words
// to IPA), lesson 8 (accent), lesson 7 (rhythm), lessons 3 and 6 (plan, at a rate) and lesson 5 (voice), and the
// shared shell plays the score. Change anything below and the stage above it still works as it did on its own.
import { speakText } from '../../lib/pipeline.js';
import { LANGUAGES, languageByCode, loadDictionary } from '../../lib/languages.js';
import { ACCENTS, loadAccent } from '../../lib/accents.js';
import { VOICES, voiceById } from '../../lib/voices.js';
import { shapeOf } from '../../lib/tractshape.js';
import { DEFAULT_FRAME } from '../../lib/score.js';
import { markAt } from '../../lib/planner.js';
import { drawTract } from '../../lib/ui/tractview.js';
import { createShell } from '../../lib/ui/lesson-shell.js';
import { log, unlog } from '../../lib/ui/demo.js';
import { t } from '../../lib/i18n.js';

const $ = (id) => document.getElementById(id);
const RATE = [0.4, 3.5];
let last = null;

// The pitch and voice quality belong to the chosen voice, so the shell's own sliders for them are left out.
const shell = createShell({
  pitch: false,
  quality: false,
  downloadScore: () => last && last.score,
  downloadName: () => `everything-${$('language').value}-${$('voice').value}.wav`,
  downloadOptions: () => ({ tractLength: last ? last.tractLength : undefined }),
});

// Dictionaries and accents are files, so they are fetched over the network. Each is fetched once, the first time
// it is chosen, and kept, because choosing a language or an accent again should not wait.
const dictionaries = new Map();
const accents = new Map();
const dictionary = async (code) => {
  if (!dictionaries.has(code)) dictionaries.set(code, await loadDictionary(code));
  return dictionaries.get(code);
};
const accentOf = async (id) => {
  if (id === 'none') return null;
  if (!accents.has(id)) accents.set(id, await loadAccent(id));
  return accents.get(id);
};

// The speed slider is 0 to 1 and the rate is on a log scale, so that halving and doubling are the same distance
// from natural speed (see `log` and `unlog` in `lib/ui/demo.js`).
const rate = () => log(Number($('rate').value), ...RATE);

// ## Building the speech
//
// Everything the controls say, handed to the pipeline. The pipeline is pure: the same text and settings always
// give the same score, which is why the page can build it afresh on every press and play it.
async function build() {
  const language = languageByCode($('language').value);
  return speakText($('text').value, {
    entries: await dictionary(language.code),
    language,
    accent: await accentOf($('accent').value),
    rhythm: $('rhythm').value,
    rate: rate(),
    intonation: $('intonation').value,
    voice: voiceById($('voice').value),
  });
}

// ## Saying it
//
// Show what each stage did (the IPA before and after the accent, the rhythm, how long it is) and any words the
// dictionary did not know, set the tract to the voice's length, and play the score with the tract following it.
async function say() {
  try { last = await build(); } catch (error) { shell.setStatus(error.message); return; }
  const u = last;
  const missing = u.words.filter((w) => !w.ipa).map((w) => w.word);
  $('stages').textContent = t('everything.stages', { before: u.before, after: u.ipa, mode: t(`rhythm.mode.${u.rhythm || 'none'}`), sec: u.duration.toFixed(2) });
  $('missing').textContent = missing.length ? t('acc.missing', { words: missing.join(', ') }) : '';
  const synth = await shell.getSynth();
  if (!synth) return;
  synth.setTractLength(u.tractLength);
  await shell.play(u.score, (frame, time) => {
    drawTract($('tract'), shapeOf(frame, { tractLength: u.tractLength }));
    const m = markAt(u.marks, time);
    $('readout').textContent = m ? `[${m.symbol}] ${m.type}` : '';
  });
}

// ## Controls
const option = (select, value, text) => select.append(Object.assign(document.createElement('option'), { value, textContent: text }));
for (const l of LANGUAGES) option($('language'), l.code, `${l.name} · ${l.native}`);
for (const a of ACCENTS) option($('accent'), a.id, a.label);
for (const v of VOICES) option($('voice'), v.id, t(`voice.label.${v.id}`));
for (const kind of ['statement', 'question', 'flat']) option($('intonation'), kind, t(`intonation.${kind}`));
option($('rhythm'), 'language', t('everything.rhythm.auto'));
for (const mode of ['stress', 'syllable', 'none']) option($('rhythm'), mode, t(`rhythm.mode.${mode}`));
$('voice').value = 'man';
$('rate').value = unlog(1, ...RATE);
const showRate = () => { $('rateOut').textContent = `×${rate().toFixed(2)}`; };
$('rate').addEventListener('input', showRate);
showRate();
const useLanguage = () => { $('text').value = languageByCode($('language').value).sample; };
$('language').addEventListener('change', useLanguage);
$('say').addEventListener('click', say);
$('stages').style.whiteSpace = 'pre-line';
useLanguage();
drawTract($('tract'), shapeOf(DEFAULT_FRAME));
