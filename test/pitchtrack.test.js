import test from 'node:test';
import assert from 'node:assert/strict';
import { yin, pitchTrack, pitchBetween, centsOff, largestJump, decimate } from '../lib/pitchtrack.js';
import { sing, parseNotes } from '../lib/melody.js';
import { renderScore } from '../lib/render.js';
import { HAPPY_BIRTHDAY, songFor } from '../lib/songs.js';

// Listening with numbers: render, then measure the pitch of what came out (`pitchtrack.js`).

const sine = (hz, rate, seconds) => Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) => Math.sin((2 * Math.PI * hz * i) / rate));

test('YIN finds the pitch of a pure tone to within a few cents, across the singing range', () => {
  for (const hz of [98, 130, 220, 440, 880]) {
    const { hz: found, clarity } = yin(sine(hz, 11025, 0.04), 11025);
    assert.ok(Math.abs(centsOff(found, hz)) < 10, `${hz} Hz: found ${found}`);
    assert.ok(clarity > 0.9);
  }
});

test('noise and silence have no pitch', () => {
  let seed = 7;
  const noise = Float32Array.from({ length: 441 }, () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1);
  assert.equal(yin(noise, 11025).hz, null);
  assert.equal(pitchTrack(new Float32Array(4410), 44100).every((p) => p.hz === null), true);
  assert.equal(decimate(Float32Array.of(1, 3, 5, 7), 2).join(), '2,6');
});

// How far each sung note's pitch is from the note, in cents, measured on the middle half of the note.
function sungCents(ipa, noteText, opts = {}) {
  const song = sing(ipa, parseNotes(noteText), { bpm: 100, ...opts });
  const track = pitchTrack(renderScore(song.score, { sampleRate: 44100 }), 44100);
  return song.notes.filter((n) => n.end - n.start > 0.3).map((n) => {
    const quarter = (n.end - n.start) / 4, mid = (n.start + n.end) / 2;
    const hz = pitchBetween(track, mid - quarter, mid + quarter);
    return { midi: n.midi, cents: hz === null ? null : centsOff(hz, 440 * 2 ** ((n.midi - 69) / 12)) };
  });
}

test('a sung melody comes out on its notes, in any base pitch', () => {
  for (const f0 of [110, 130, 200]) {
    for (const { midi, cents } of sungCents('ˈhæpi ˈbɜːθdeɪ tə ˈjuː', 'G4:0.75 G4:0.25 A4 G4 C5 B4:2', { f0 })) {
      assert.ok(cents !== null && Math.abs(cents) < 20, `f0 ${f0}, note ${midi}: ${cents} cents off`);
    }
  }
});

test('Happy Birthday in every language: every sustained note is within 25 cents, and the pitch never jumps', () => {
  for (const code of Object.keys(HAPPY_BIRTHDAY)) {
    const { text, notes } = songFor(code);
    const song = sing(text, parseNotes(notes), { bpm: 140 });
    const track = pitchTrack(renderScore(song.score, { sampleRate: 44100 }), 44100);
    for (const [i, n] of song.notes.entries()) {
      if (n.end - n.start < 0.3) continue;
      const quarter = (n.end - n.start) / 4, mid = (n.start + n.end) / 2;
      const hz = pitchBetween(track, mid - quarter, mid + quarter);
      assert.ok(hz !== null, `${code} note ${i}: no pitch found`);
      const cents = centsOff(hz, 440 * 2 ** ((n.midi - 69) / 12));
      assert.ok(Math.abs(cents) < 25, `${code} note ${i}: ${cents.toFixed(0)} cents off`);
    }
    // The biggest step between neighbouring 10 ms frames (counting only frames the tracker is sure of) is a glide, not a glitch.
    const jump = largestJump(track);
    assert.ok(jump < 4, `${code}: pitch jumped ${jump.toFixed(1)} semitones in 10 ms`);
  }
});
