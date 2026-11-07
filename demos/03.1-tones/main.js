// # Lesson 3.1: Tones
//
// A step on the way to Demo 3. One thing is free: the **pitch contour** of a single vowel. The pad is the five
// tone levels (Chao's `˥˦˧˨˩`, 5 high to 1 low); what you draw becomes a list of levels, the same list the
// tokenizer reads from `ma˥˩`. The planner turns each level into a pitch (`toneHz`: a fixed step of octaves
// around your own pitch) and spreads them over the vowel, so this page is `plan(vowel + toneLetters(levels))`
// and nothing else. The four Mandarin tones are buttons.
import { plan } from '../../lib/planner.js';
import { toneLetters } from '../../lib/ipa.js';
import { shapeOf } from '../../lib/tractshape.js';
import { DEFAULT_FRAME } from '../../lib/score.js';
import { drawTract } from '../../lib/ui/tractview.js';
import { createTonePad } from '../../lib/ui/tonepad.js';
import { createShell, round } from '../../lib/ui/lesson-shell.js';
import { t } from '../../lib/i18n.js';

const $ = (id) => document.getElementById(id);
const VOWELS = ['a', 'i', 'u'];
const MANDARIN = [[5], [3, 5], [2, 1, 4], [5, 1]];
const state = { vowel: 'a', levels: [5, 1] };
let last = null;

const shell = createShell({
  downloadScore: () => last && last.score,
  downloadName: (s) => `tone-${state.vowel}-${round(s.f0)}hz.wav`,
});

// A vowel with a tone, and nothing else: no declination, so the only pitch movement is the tone.
const build = (levels) => plan(state.vowel + toneLetters(levels), { f0: shell.state.f0, declination: 0 });

async function say(levels) {
  state.levels = levels;
  pad.set(levels);
  last = build(levels);
  const p = last;
  await shell.play(p.score, (frame) => {
    drawTract($('tract'), shapeOf(frame));
    $('readout').textContent = t('tone.readout', { symbol: state.vowel, letters: toneLetters(levels), hz: Math.round(frame.f0) });
  });
}

const pad = createTonePad($('pad'), {
  label: t('tone.pad.attr'),
  onChange: (levels) => { state.levels = levels; $('readout').textContent = `${state.vowel}${toneLetters(levels)}`; },
  onRelease: (levels) => say(levels),
});
pad.set(state.levels);

// ## Buttons
const row = (id, items, label, onPress) => {
  for (const item of items) {
    const b = document.createElement('button');
    b.textContent = label(item);
    b.addEventListener('click', () => onPress(item, b));
    $(id).append(b);
  }
};
row('presets', MANDARIN, (levels) => toneLetters(levels), (levels) => say(levels));
row('vowels', VOWELS, (v) => v, (v, b) => {
  state.vowel = v;
  for (const x of $('vowels').children) x.classList.toggle('primary', x === b);
  say(state.levels);
});
$('vowels').children[0].classList.add('primary');

$('readout').style.whiteSpace = 'pre-line';
drawTract($('tract'), shapeOf(DEFAULT_FRAME));
