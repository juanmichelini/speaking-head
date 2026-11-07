import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ratioOf, semitonesOf, hzAt, levelSemitones, contourOf, declination, applyLine, STRESS_BUMP } from '../lib/prosody.js';
import { plan } from '../lib/planner.js';

test('semitones are twelve to the octave, and ratios and semitones are inverses', () => {
  assert.equal(hzAt(130, 0), 130);
  assert.ok(Math.abs(hzAt(130, 12) - 260) < 1e-9);
  assert.ok(Math.abs(hzAt(130, -12) - 65) < 1e-9);
  for (const st of [-7, -1.5, 0, 0.3, 5, 12]) assert.ok(Math.abs(semitonesOf(ratioOf(st)) - st) < 1e-12);
});

test('stress is a bump, tone is levels, and they add; range scales both', () => {
  assert.deepEqual(contourOf({}), [0]);
  assert.ok(STRESS_BUMP[2] > STRESS_BUMP[1] && STRESS_BUMP[1] > 0, 'primary stress above secondary above none');
  assert.deepEqual(contourOf({ tone: [3] }), [0], 'level 3 is the speaker\'s own pitch');
  const fall = contourOf({ tone: [5, 1] });
  assert.ok(fall[0] > 0 && fall[1] < 0 && Math.abs(fall[0] + fall[1]) < 1e-9, 'a 5 to 1 fall is symmetric about the base');
  assert.ok(Math.abs(levelSemitones(5) - 2.88) < 1e-9, 'two levels of 1.44 semitones');
  const stressed = contourOf({ stress: 2, tone: [5, 1] });
  assert.ok(Math.abs(stressed[0] - (fall[0] + STRESS_BUMP[2])) < 1e-9, 'they add');
  assert.ok(contourOf({ stress: 2, tone: [5, 1] }, 0).every((st) => Math.abs(st) === 0), 'a flat voice has no pitch movement');
  assert.ok(Math.abs(contourOf({ tone: [5] }, 2)[0] - 2 * fall[0]) < 1e-9);
});

test('a phrase line is added to every frame by how far through the phrase it is', () => {
  const score = { keyframes: [{ t: 0, f0: 100 }, { t: 1, f0: 100 }, { t: 2, f0: 100 }], duration: 2 };
  const out = applyLine(score, (u) => 12 * u);
  assert.equal(out.keyframes[0].f0, 100);
  assert.ok(Math.abs(out.keyframes[1].f0 - hzAt(100, 6)) < 1e-9);
  assert.ok(Math.abs(out.keyframes[2].f0 - 200) < 1e-9);
  const down = applyLine(score, declination(0.1)).keyframes;
  assert.ok(Math.abs(down[2].f0 - 90) < 1e-9, 'a statement that falls by 10 % ends 10 % lower');
});

// The planner was rebuilt on this module. Scores recorded from the planner before that must not have moved.
test('the planner gives the same scores as before it was rebuilt on prosody', () => {
  const golden = JSON.parse(readFileSync(new URL('./fixtures/planner-golden.json', import.meta.url), 'utf8'));
  for (const g of golden) {
    const p = plan(g.text, g.options);
    assert.equal(p.score.keyframes.length, g.keyframes.length, g.text);
    assert.ok(Math.abs(p.duration - g.duration) < 1e-9, `${g.text} duration`);
    g.keyframes.forEach((k, i) => {
      for (const [name, v] of Object.entries(k)) assert.ok(Math.abs(p.score.keyframes[i][name] - v) < 1e-7, `${g.text} ${JSON.stringify(g.options)} frame ${i} ${name}`);
    });
  }
});
