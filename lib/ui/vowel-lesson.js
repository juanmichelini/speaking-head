// # A vowel lesson
//
// The claim of Demo 1: **the IPA vowel chart is a map of where the tongue goes**, so dragging across it
// should move a vocal tract the way a real tongue moves. This file is the whole instrument. Lesson 1
// uses all of it; the steps before it (1.1 to 1.4) use the same instrument with fewer things free, one
// dimension at a time:
//
// - 1.1 and 1.2 hold the tongue at one height and let it slide from front to back, first with the lips
//   spread and then rounded
// - 1.3 and 1.4 free the height as well, still with the lips held spread, then held rounded
//
// A lesson is `startVowelLesson(options)`:
//
// - `visible(vowel)`: which vowels are on the chart and the buttons (all, by default)
// - `lockHeight`: a height from 0 (close) to 1 (open) to hold the tongue at, or `null` to leave it free
// - `lockRounded`: `0` for spread lips, `1` for rounded, or `null` to leave the rounding free
//
// There is almost nothing else here because the ideas live in the shared library:
//
// - `lib/vowels.js` knows the chart and the reference formants of each vowel
// - `lib/vowel-map.js` turns a chart position into a tongue, jaw and lips
// - `lib/pinktrombone.js` makes the sound; `lib/ui/*` draws it
//
// What is left here is wiring: pointer in, sound and picture out.
import { VOWELS, vowelBySymbol } from '../vowels.js';
import { vowelShape, vowelFrame, vowelSequence, cursorAt } from '../vowel-map.js';
import { shapeOf } from '../tractshape.js';
import { formants } from '../analysis.js';
import { drawTract } from './tractview.js';
import { createVowelChart } from './vowelchart.js';
import { createShell, round } from './lesson-shell.js';
import { t, tp } from '../i18n.js';

const CARDINAL = ['i', 'e', 'ɛ', 'a', 'ɑ', 'ɔ', 'o', 'u'];
const EVERYTHING = ['i', 'y', 'ɪ', 'ʏ', 'e', 'ø', 'ɛ', 'œ', 'æ', 'a', 'ɶ', 'ɑ', 'ɒ', 'ʌ', 'ɔ', 'ɤ', 'o', 'ʊ', 'u', 'ɯ', 'ɨ', 'ʉ', 'ɘ', 'ɵ', 'ə', 'ɜ', 'ɞ', 'ɐ'];

export function startVowelLesson({ visible = () => true, lockHeight = null, lockRounded = null } = {}) {
const list = VOWELS.filter(visible);
const $ = (id) => document.getElementById(id);

// ## State
//
// Four numbers describe everything the chart can say: backness `b`, height `h`, rounding (0 spread
// to 1 fully rounded) and pitch.
const state = { b: list[0].b, h: lockHeight ?? list[0].h, rounded: lockRounded ?? 0 };
// The shared shell (`lesson-shell.js`) keeps pitch and tenseness and does the sound; a slider moves a held sound.
let lastSequence = null;
const shell = createShell({
  onControl: () => updateSound(),
  downloadScore: () => lastSequence || vowelSequence(lockHeight !== null || lockRounded !== null ? THESE : CARDINAL, { f0: shell.state.f0, tenseness: shell.state.tenseness }),
  downloadName: (s) => `vowels-${round(s.f0)}hz.wav`,
});

function frameNow() {
  return vowelFrame(vowelShape(state.b, state.h, state.rounded), { f0: shell.state.f0, tenseness: shell.state.tenseness });
}

// ## Showing it
//
// The nearest named vowel is the one a phonetician would call this position. Measuring the
// formants of the shape that is actually playing shows the link between articulation and
// acoustics: move up the chart and F1 falls, move left and F2 rises.
function nearestSymbol(b, h, rounded) {
  let best = null, bestD = Infinity;
  for (const v of list) {
    const d = (v.b - b) ** 2 + (v.h - h) ** 2 + 0.05 * Math.abs((v.rounded ? 1 : 0) - rounded);
    if (d < bestD) { best = v; bestD = d; }
  }
  return best;
}

const chart = createVowelChart($('chart'), {
  onPress: (pos) => { applyPosition(pos); startSound(); },
  onMove: (pos) => { applyPosition(pos); updateSound(); },
  onRelease: () => stopSound(),
  visible, lockHeight, lockRounded,
});

function applyPosition(pos) {
  state.b = pos.b;
  state.h = pos.h;
  if (pos.rounded !== null) {
    state.rounded = pos.rounded;
    if ($('rounding')) $('rounding').value = pos.rounded;
  }
  refresh();
}

let pending = false;
function refresh(frame = frameNow(), cursor = { b: state.b, h: state.h }, vowel = nearestSymbol(cursor.b, cursor.h, state.rounded)) {
  chart.setCursor(cursor.b, cursor.h);
  chart.highlight(vowel.symbol);
  drawTract($('tract'), shapeOf(frame));
  if ($('roundingOut')) $('roundingOut').textContent = t(state.rounded < 0.15 ? 'rounding.spread' : state.rounded > 0.85 ? 'rounding.rounded' : 'rounding.half');
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    const [f1, f2] = formants(frame, { steps: 8192, count: 2 });
    $('readout').textContent =
      t('vowel.readout', {
        symbol: vowel.symbol, name: vowel.name.split(' ').map(tp).join(' '), f1: Math.round(f1), f2: Math.round(f2),
        rf1: vowel.f1, rf2: vowel.f2, approx: vowel.approx ? t('vowel.approx') : '',
      });
  });
}
$('readout').style.whiteSpace = 'pre-line';

// ## Sound
//
// Pressing starts a held sound; moving glides it; lifting releases (see `lesson-shell.js`).
const startSound = () => shell.startHeld(frameNow);
const updateSound = () => shell.updateHeld(frameNow());
const stopSound = () => shell.stopHeld();

// ## Buttons for every vowel
//
// The same thing without a pointer on the chart: hold a button (or Space and Enter on it).
for (const v of list) {
  const symbol = v.symbol;
  const button = document.createElement('button');
  button.textContent = symbol;
  button.title = v.name.split(' ').map(tp).join(' ');
  const down = () => { applyPosition({ b: v.b, h: v.h, rounded: lockRounded ?? (v.rounded ? 1 : 0) }); startSound(); button.classList.add('active'); };
  const up = () => { stopSound(); button.classList.remove('active'); };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointerleave', up);
  button.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(); } });
  button.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
  $('buttons').append(button);
}

// ## Controls
if ($('rounding')) $('rounding').addEventListener('input', (e) => { state.rounded = Number(e.target.value); refresh(); updateSound(); });

// ## Playing a sequence
//
// A score from `vowelSequence`, played through the same engine, with the chart cursor and the
// tract following along (the shell plays it).
async function playSequence(symbols) {
  const sequence = vowelSequence(symbols, { f0: shell.state.f0, tenseness: shell.state.tenseness });
  lastSequence = sequence;
  shell.setStatus(t('status.playing', { list: symbols.join(' ') }));
  await shell.play(sequence, (frame, time) => {
    const c = cursorAt(sequence, time);
    refresh(frame, c, vowelBySymbol(c.symbol));
  });
  shell.setStatus('');
}
// The vowels of this lesson, in chart order, front to back and close to open.
const THESE = [...list].sort((x, y) => x.h - y.h || x.b - y.b).map((v) => v.symbol);
if ($('playCardinal')) $('playCardinal').addEventListener('click', () => playSequence(CARDINAL));
if ($('playAll')) $('playAll').addEventListener('click', () => playSequence(EVERYTHING));
if ($('playThese')) $('playThese').addEventListener('click', () => playSequence(THESE));
refresh();
}
