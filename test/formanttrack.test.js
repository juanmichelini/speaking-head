import test from 'node:test';
import assert from 'node:assert/strict';
import { formantsOf, levinson } from '../lib/formanttrack.js';
import { VOWELS } from '../lib/vowels.js';
import { plan } from '../lib/planner.js';
import { renderScore } from '../lib/render.js';

// Listening with numbers, part two: formants measured from the audio itself (`formanttrack.js`).

// A buzz at 120 Hz passed through two-pole resonators at the given frequencies: a vowel built by hand.
function resonated(formants, rate = 44100, seconds = 0.1) {
  const x = new Float32Array(Math.round(rate * seconds));
  for (let i = 0; i < x.length; i += Math.round(rate / 120)) x[i] = 1;
  let y = x;
  for (const f of formants) {
    const r = Math.exp((-Math.PI * 80) / rate), c = 2 * r * Math.cos((2 * Math.PI * f) / rate);
    const out = new Float32Array(y.length);
    for (let i = 0; i < y.length; i++) out[i] = y[i] + c * (out[i - 1] || 0) - r * r * (out[i - 2] || 0);
    y = out;
  }
  return y;
}

test('formants of hand-made resonances are found to within 8 %', () => {
  for (const want of [[700, 1200, 2600], [500, 2200, 3000], [500, 1500, 2500]]) {
    const found = formantsOf(resonated(want), 44100, { count: 3 });
    want.forEach((f, i) => assert.ok(Math.abs(found[i] - f) / f < 0.08, `${want}: found ${found.map(Math.round)}`));
  }
});

test('Levinson-Durbin recovers a one-pole filter from its autocorrelation', () => {
  // x[n] = 0.5 x[n-1] + noise has autocorrelation r[k] = 0.5^k, and the predictor is a = [1, -0.5, 0].
  const a = levinson([1, 0.5, 0.25], 2);
  assert.ok(Math.abs(a[1] + 0.5) < 1e-9 && Math.abs(a[2]) < 1e-9);
});

// Rendered end to end: IPA, planner, engine, samples, then measured. Back rounded vowels have F1 and F2 close
// together and the method cannot always tell them apart, so those are left to `analysis.js` (which reads the tract).
test('every rendered vowel has the formants the vowel chart says, within 15 %', () => {
  let checked = 0;
  for (const v of VOWELS) {
    if (v.f2 - v.f1 < 400) continue;
    const p = plan(v.symbol, { f0: 130, declination: 0 });
    const samples = renderScore(p.score, { sampleRate: 44100 });
    const m = p.marks.find((x) => x.type === 'vowel'), mid = (m.start + m.end) / 2;
    const [f1, f2] = formantsOf(samples.subarray(Math.floor((mid - 0.04) * 44100), Math.floor((mid + 0.04) * 44100)), 44100);
    assert.ok(Math.abs(f1 - v.f1) / v.f1 < 0.15, `${v.symbol} F1 ${Math.round(f1)} vs ${v.f1}`);
    assert.ok(Math.abs(f2 - v.f2) / v.f2 < 0.15, `${v.symbol} F2 ${Math.round(f2)} vs ${v.f2}`);
    checked++;
  }
  assert.ok(checked >= 20);
});
