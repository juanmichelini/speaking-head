import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { sing, parseNotes, midiOf, noteLine } from '../lib/melody.js';

// Melody (step 3.3) is written twice, in `lib/melody.js` and `fsharp/src/07b-Melody.fs`. They must sing the same
// notes at the same times, and give the same pitch keyframe by keyframe.
//
// The compiled files exist only after the F# build (see `fsharp/README.md`); the `fsharp` workflow sets REQUIRE_CORE.
const dir = new URL('../core/src/', import.meta.url);
const built = existsSync(new URL('07b-Melody.js', dir));
if (!built && process.env.REQUIRE_CORE) throw new Error('Error: core/src/07b-Melody.js was not built');
const skip = built ? false : 'core/ is not built: see fsharp/README.md';
const fs = built ? await import(new URL('07b-Melody.js', dir).href) : null;
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} vs ${b}`);

test('note names agree', { skip }, () => {
  for (const name of ['C4', 'A4', 'F#3', 'Bb4', 'c#5', 'h4', 'C', '', 'G-1']) {
    const js = midiOf(name);
    const c = fs.midiOf(name);
    assert.equal(c === undefined ? null : c, js, name);
  }
});

const songs = [
  ['ˈhæpi ˈbɜːθdeɪ', 'C4 C4 D4:2 C4:2 F4:2', 100],
  ['ˈkasa ˈpero', 'G4:0.5 E4 C4:3', 80],
  ['ˈa', 'A4', 100],
  ['ðə ˈkæts ɑː ˈtʃeɪsɪŋ', 'D4 F4 A4:2 F4 D4', 140],
];

for (const [ipa, text, bpm] of songs) {
  test(`sing agrees: ${ipa}`, { skip }, () => {
    const js = sing(ipa, parseNotes(text), { bpm });
    const notes = fs.parseNotes(text);
    const compiled = fs.sing(bpm, (o) => o, ipa, notes);
    const sung = Array.from(compiled.Notes);
    assert.equal(sung.length, js.notes.length);
    js.notes.forEach((n, i) => {
      assert.equal(sung[i].Midi, n.midi, `note ${i}`);
      near(sung[i].Start, n.start, `note ${i} start`);
      near(sung[i].End, n.end, `note ${i} end`);
    });
    const keys = Array.from(compiled.Plan.Score.Keyframes);
    assert.equal(keys.length, js.score.keyframes.length);
    js.score.keyframes.forEach((k, i) => {
      near(keys[i].T, k.t, `keyframe ${i} t`);
      near(keys[i].Frame.F0, k.f0, `keyframe ${i} f0`);
    });
  });
}
