// # Lesson 3.2: Intonation
//
// A step on the way to Demo 3, and the second step of the pitch ladder. Lesson 3.1 gave one syllable a pitch
// contour. Under all the syllables of a phrase there is one slower line: the pitch of the phrase itself. A
// statement drifts down; a question lifts at the end. This page frees exactly that line, with two numbers: how far
// the pitch **drifts down** over the phrase and how far it **rises** at the end (in semitones). The sounds, the
// stress and the tones are untouched; the line is only added on top (`planWithLine`, `lib/prosody.js`).
import { planWithLine } from '../../lib/planner.js';
import { declination, rise, plus, semitonesOf } from '../../lib/prosody.js';
import { shapeOf } from '../../lib/tractshape.js';
import { DEFAULT_FRAME } from '../../lib/score.js';
import { drawTract } from '../../lib/ui/tractview.js';
import { createShell, round } from '../../lib/ui/lesson-shell.js';
import { t } from '../../lib/i18n.js';

const $ = (id) => document.getElementById(id);
const PRESETS = { statement: { fall: 0.08, rise: 0 }, question: { fall: 0.03, rise: 5 }, flat: { fall: 0, rise: 0 } };
let last = null;

const shell = createShell({
  downloadScore: () => last && last.score,
  downloadName: (s) => `intonation-${round(s.f0)}hz.wav`,
});

// The line the two sliders make: a drift down plus a rise at the end.
const lineNow = () => plus(declination(Number($('fall').value)), rise(Number($('rise').value), 0.75));

// ## Drawing the line
//
// The phrase line itself, from the start of the phrase to its end, so you can see what you are adding.
const NS = 'http://www.w3.org/2000/svg';
function drawLine(line, u = null) {
  const svg = $('line');
  svg.replaceChildren();
  const el = (name, attrs) => { const n = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const y = (st) => 50 - st * 6;
  svg.append(el('line', { x1: 0, y1: y(0), x2: 300, y2: y(0), class: 'axis-tick' }));
  const points = Array.from({ length: 61 }, (_, i) => `${(i / 60) * 300},${y(line(i / 60))}`).join(' ');
  svg.append(el('polyline', { points, class: 'tone-line', fill: 'none' }));
  if (u !== null) svg.append(el('circle', { cx: u * 300, cy: y(line(u)), r: 6, class: 'chart-cursor' }));
}

async function say() {
  const line = lineNow();
  last = planWithLine($('ipa').value, line, { f0: shell.state.f0 });
  const p = last;
  await shell.play(p.score, (frame, time) => {
    drawTract($('tract'), shapeOf(frame));
    drawLine(line, Math.min(1, time / (p.duration || 1)));
    $('readout').textContent = t('intonation.readout', { hz: Math.round(frame.f0) });
  });
  drawLine(line);
}

// ## Controls
const show = () => {
  $('fallOut').textContent = `${(Number($('fall').value) * 100).toFixed(0)} % (${semitonesOf(1 - Number($('fall').value)).toFixed(1)} st)`;
  $('riseOut').textContent = `${Number($('rise').value).toFixed(1)} st`;
  drawLine(lineNow());
};
for (const [name, preset] of Object.entries(PRESETS)) {
  const b = document.createElement('button');
  b.textContent = t(`intonation.${name}`);
  b.addEventListener('click', () => { $('fall').value = preset.fall; $('rise').value = preset.rise; show(); say(); });
  $('presets').append(b);
}
$('fall').addEventListener('input', show);
$('rise').addEventListener('input', show);
$('say').addEventListener('click', say);
$('fall').value = PRESETS.statement.fall;
$('rise').value = PRESETS.statement.rise;
$('readout').style.whiteSpace = 'pre-line';
drawTract($('tract'), shapeOf(DEFAULT_FRAME));
show();
