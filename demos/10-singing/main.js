// # Lesson 10: Singing
//
// Type syllables as IPA and a note for each one (`C4`, or `C4:2` for two beats), and hear them sung. This page does
// no work of its own: `sing` in `lib/melody.js` gives every syllable the length of its note (lesson 7's fit) and
// puts the note's pitch under it (lesson 3's pitch line, in semitones), and the shared shell plays the score. A
// voice from lesson 5 decides the base pitch and quality, so a bass and a soprano sing the same notes in their own
// ranges of colour.
import { sing, parseNotes } from '../../lib/melody.js';
import { voiceById, VOICES } from '../../lib/voices.js';
import { shapeOf } from '../../lib/tractshape.js';
import { DEFAULT_FRAME } from '../../lib/score.js';
import { markAt } from '../../lib/planner.js';
import { drawTract } from '../../lib/ui/tractview.js';
import { createShell } from '../../lib/ui/lesson-shell.js';
import { t } from '../../lib/i18n.js';

const $ = (id) => document.getElementById(id);
let last = null;

// The pitch is in the notes, so the shell's own pitch slider is left out.
const shell = createShell({
  pitch: false,
  quality: false,
  downloadScore: () => last && last.score,
  downloadName: () => `singing-${$('voice').value}.wav`,
  downloadOptions: () => ({ tractLength: last ? last.tractLength : undefined }),
});

// Two examples to start from: a scale, and a tune everyone knows.
const EXAMPLES = {
  scale: { text: 'ˈdoʊ ˈreɪ ˈmiː ˈfɑː ˈsoʊ ˈlɑː ˈtiː ˈdoʊ', notes: 'C4 D4 E4 F4 G4 A4 B4 C5:2', bpm: 120 },
  birthday: { text: 'ˈhæpi ˈbɜːθdeɪ tə ˈjuː', notes: 'G4:0.75 G4:0.25 A4 G4 C5 B4:2', bpm: 100 },
};

// ## Building the song
//
// The voice gives the base pitch and quality; the notes give everything else.
function build() {
  const notes = parseNotes($('notes').value);
  if (notes.length === 0) throw new Error(t('sing.empty'));
  const voice = voiceById($('voice').value);
  const song = sing($('text').value, notes, {
    bpm: Number($('bpm').value), f0: voice.f0, tenseness: voice.tenseness,
    vibratoDepth: voice.vibratoDepth, jitter: voice.jitter,
  });
  return { ...song, tractLength: voice.tractCm };
}

// ## Drawing the notes
//
// A piano roll: time across, pitch up, one bar for each sung syllable. The cursor line follows the playing score.
const SVG = 'http://www.w3.org/2000/svg';
function drawRoll(song) {
  const svg = $('roll');
  svg.replaceChildren();
  const midis = song.notes.map((n) => n.midi);
  const low = Math.min(...midis) - 1, high = Math.max(...midis) + 1;
  const x = (time) => 10 + (580 * time) / song.duration;
  const y = (midi) => 110 - (100 * (midi - low)) / (high - low);
  for (const n of song.notes) {
    const bar = document.createElementNS(SVG, 'rect');
    bar.setAttribute('x', x(n.start)); bar.setAttribute('width', Math.max(2, x(n.end) - x(n.start)));
    bar.setAttribute('y', y(n.midi) - 4); bar.setAttribute('height', 8); bar.setAttribute('rx', 3);
    bar.setAttribute('fill', 'currentColor');
    svg.append(bar);
  }
  const cursor = document.createElementNS(SVG, 'line');
  cursor.setAttribute('id', 'cursor'); cursor.setAttribute('y1', 0); cursor.setAttribute('y2', 120);
  cursor.setAttribute('stroke', 'currentColor'); cursor.setAttribute('opacity', 0.4);
  svg.append(cursor);
  return (time) => { cursor.setAttribute('x1', x(time)); cursor.setAttribute('x2', x(time)); };
}

// ## Singing it
async function say() {
  try { last = build(); } catch (error) { shell.setStatus(error.message); return; }
  const song = last;
  const moveCursor = drawRoll(song);
  const synth = await shell.getSynth();
  if (!synth) return;
  synth.setTractLength(song.tractLength);
  await shell.play(song.score, (frame, time) => {
    drawTract($('tract'), shapeOf(frame, { tractLength: song.tractLength }));
    moveCursor(time);
    const m = markAt(song.marks, time);
    $('readout').textContent = m ? `[${m.symbol}] ${m.type}` : '';
  });
}

// ## Controls
const option = (select, value, text) => select.append(Object.assign(document.createElement('option'), { value, textContent: text }));
for (const key of Object.keys(EXAMPLES)) option($('example'), key, t(`sing.example.${key}`));
for (const v of VOICES) option($('voice'), v.id, t(`voice.label.${v.id}`));
$('voice').value = 'woman';
const showBpm = () => { $('bpmOut').textContent = `${$('bpm').value} ♩`; };
const useExample = () => {
  const e = EXAMPLES[$('example').value];
  $('text').value = e.text; $('notes').value = e.notes; $('bpm').value = e.bpm;
  showBpm();
};
$('example').addEventListener('change', useExample);
$('bpm').addEventListener('input', showBpm);
$('say').addEventListener('click', say);
useExample();
drawTract($('tract'), shapeOf(DEFAULT_FRAME));
