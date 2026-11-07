// # Demo 2: Consonants
//
// The claim of this experiment: **the IPA consonant table is a table of tract gestures**. Place is
// where the tract narrows, manner is how, and voicing is whether the voice is on. Press a symbol
// and the same engine that said the vowels makes the sound.
//
// Pressing means two things, depending on the sound:
//
// - **Sustainable** sounds (fricatives, nasals, approximants, laterals) are held: the tract moves
//   to the steady frame of the gesture and stays there until you let go.
// - **Transient** sounds (stops, affricates, taps, trills) cannot be held without changing what
//   they are, so the whole gesture plays once.
//
// With "between vowels" chosen, the consonant is played the way the reference recordings of the IPA
// chart have it: a vowel, the consonant, the vowel, the consonant, the vowel ("a C a C a"), at natural
// speed, because most consonants are heard by what they do to the vowels next to them. That makes each
// press comparable one to one with the Wikipedia recordings, which `scripts/compare-consonants.mjs`
// measures. With no vowel, a press is stretched five times so each phase can be heard on its own.
import { CONSONANTS, consonantBySymbol, consonantGesture, kindOf, NOT_MODELLED } from '../../lib/consonants.js';
import { concatScores, scaleTime, DEFAULT_FRAME } from '../../lib/score.js';
import { betweenVowels } from '../../lib/between.js';
import { shapeOfSymbol } from '../../lib/vowel-map.js';
import { shapeOf } from '../../lib/tractshape.js';
import { drawTract } from '../../lib/ui/tractview.js';
import { createConsonantTable } from '../../lib/ui/consonanttable.js';
import { createShell, withTenseness, round } from '../../lib/ui/lesson-shell.js';
import { t, tp } from '../../lib/i18n.js';

const $ = (id) => document.getElementById(id);
let lastScore = null;
const SINGLE_PRESS_STRETCH = 5;
const state = { carrier: 'none', aspirated: false };
// The shared shell (`lib/ui/lesson-shell.js`) keeps pitch and voice quality and does the sound.
const shell = createShell({
  downloadScore: () => lastScore || withTenseness(gestureOf('s').score, shell.state.tenseness),
  downloadName: (s) => `consonant-${round(s.f0)}hz.wav`,
});

// ## Choosing the carrier
//
// A carrier vowel is a tract shape, taken from the vowel library built in Demo 1.
function carrierShape() {
  if (state.carrier === 'none') return null;
  const { tongueIndex, tongueDiameter, lips } = shapeOfSymbol(state.carrier);
  return { tongueIndex, tongueDiameter, lips };
}
const gestureOf = (symbol) =>
  consonantGesture(consonantBySymbol(symbol), { f0: shell.state.f0, carrier: carrierShape(), aspirated: state.aspirated });

// ## Showing it
function show(frame, symbol) {
  drawTract($('tract'), shapeOf(frame));
  const c = consonantBySymbol(symbol);
  if (!c) return;
  $('readout').textContent = t('cons.readout', { symbol, voicing: tp(c.voiced ? 'voiced' : 'voiceless'), place: tp(c.place), manner: tp(c.manner) });
  table.highlight(symbol);
}
$('readout').style.whiteSpace = 'pre-line';

// ## Sound
//
// A sound that can be held is held for as long as the pointer is down; any other is a gesture that plays through.
async function press(symbol) {
  shell.cancelPlaying();
  const g = gestureOf(symbol);
  // Between vowels: "a C a C a" at natural speed. Alone: five times as long as the gesture's natural
  // length, so each phase of it (closure, burst, release, glide) can be heard on its own.
  // (A stop, an affricate or a tap alone is not stretched: these are quick by nature; see `quick` in
  // `consonants.js`.)
  const c = consonantBySymbol(symbol);
  const quickStop = ['stop', 'affricate', 'tap'].includes(kindOf(c)) && c.symbol !== 'ʔ';
  const score = withTenseness(state.carrier === 'none'
    ? scaleTime(g.score, quickStop ? 1 : SINGLE_PRESS_STRETCH)
    : betweenVowels(c, { f0: shell.state.f0, carrier: carrierShape(), aspirated: state.aspirated }).score, shell.state.tenseness);
  lastScore = score;
  if (g.kind === 'continuant' && state.carrier === 'none') {
    const steady = () => withTenseness(g.steady, shell.state.tenseness);
    show(g.steady, symbol);
    await shell.startHeld(steady);
  } else {
    await shell.play(score, (frame) => show(frame, symbol));
  }
}
const release = () => shell.stopHeld();
const table = createConsonantTable($('table'), { onPress: press, onRelease: release });

// ## Playing a family
//
// Several gestures joined into one score by `concatScores`, animated while it plays.
async function playFamily(filter, label) {
  const symbols = CONSONANTS.filter(filter).map((c) => c.symbol);
  const parts = symbols.map((s) => gestureOf(s).score);
  const score = withTenseness(concatScores(parts, 0.1), shell.state.tenseness);
  lastScore = score;
  const starts = [];
  let at = 0;
  for (const p of parts) { starts.push(at); at += p.duration + 0.1; }
  shell.setStatus(t('status.playingLabel', { label: tp(label), list: symbols.join(' ') }));
  await shell.play(score, (frame, time) => {
    let i = starts.findIndex((s, k) => time >= s && (k === starts.length - 1 || time < starts[k + 1]));
    show(frame, symbols[Math.max(0, i)]);
  });
  shell.setStatus('');
}
$('playRow').addEventListener('click', () => playFamily((c) => c.manner === 'plosive', 'stops'));
$('playFric').addEventListener('click', () => playFamily((c) => c.manner === 'fricative', 'fricatives'));

// ## Controls
$('carrier').addEventListener('change', (e) => { state.carrier = e.target.value; });
$('aspirated').addEventListener('change', (e) => { state.aspirated = e.target.checked; });
NOT_MODELLED.forEach((note, i) => { const li = document.createElement('li'); li.textContent = t(`nm.${i + 1}`); $('notModelled').append(li); });
drawTract($('tract'), shapeOf(DEFAULT_FRAME));
