import test from 'node:test';
import assert from 'node:assert/strict';
import { midiOf, midiOfHz, parseNotes, noteLine, sing } from '../lib/melody.js';
import { hzAt } from '../lib/prosody.js';

// Melody is speech with the pitch and length of each syllable given by notes.

test('note names are MIDI numbers: C4 is 60, A4 is 69, sharps and flats move by one', () => {
  assert.equal(midiOf('C4'), 60);
  assert.equal(midiOf('A4'), 69);
  assert.equal(midiOf('F#3'), 54);
  assert.equal(midiOf('Bb4'), 70);
  assert.equal(midiOf('h4'), null);
  assert.equal(midiOf('C'), null);
  assert.ok(Math.abs(midiOfHz(440) - 69) < 1e-9);
});

test('parseNotes reads names with optional beats and drops what is not a note', () => {
  assert.deepEqual(parseNotes('C4 D4:2 E4:0.5'), [{ midi: 60, beats: 1 }, { midi: 62, beats: 2 }, { midi: 64, beats: 0.5 }]);
  assert.deepEqual(parseNotes('C4 hello E4:x G4:-1 '), [{ midi: 60, beats: 1 }]);
  assert.deepEqual(parseNotes(''), []);
});

test('noteLine holds each pitch and glides across the boundary', () => {
  const line = noteLine([{ start: 0, end: 1 }, { start: 1, end: 2 }], [0, 4], 0.1);
  assert.equal(line(0.5), 0);
  assert.equal(line(1.5), 4);
  assert.ok(Math.abs(line(1) - 2) < 1e-9, 'halfway through the glide');
  assert.equal(noteLine([], [])(1), 0);
});

// The pitch a score has at the middle of a mark.
const pitchAt = (score, t) => {
  const ks = score.keyframes;
  let i = 0;
  while (i < ks.length - 1 && ks[i + 1].t <= t) i++;
  const a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)];
  return b.t === a.t ? a.f0 : a.f0 + ((b.f0 - a.f0) * (t - a.t)) / (b.t - a.t);
};

test('each syllable is sung at its note and lasts its beats', () => {
  const song = sing('ˈhæpi ˈbɜːθdeɪ', parseNotes('C4 C4 D4:2 C4:2'), { bpm: 120 });
  assert.equal(song.notes.length, 4);
  const mid = (n) => (n.start + n.end) / 2;
  assert.ok(Math.abs(pitchAt(song.score, mid(song.notes[0])) - hzAt(130, 60 - midiOfHz(130))) < 1);
  assert.ok(pitchAt(song.score, mid(song.notes[2])) > pitchAt(song.score, mid(song.notes[1])) * 1.1, 'D4 is above C4');
  // 120 bpm: a beat is half a second; the two-beat notes are about twice the one-beat notes.
  const length = (n) => n.end - n.start;
  assert.ok(length(song.notes[2]) > 1.7 * length(song.notes[1]));
  assert.ok(Math.abs(length(song.notes[1]) - 0.5) < 0.08);
});

test('a note carries on when there are more syllables than notes; a melody needs a note', () => {
  const song = sing('ˈa ˈa ˈa', parseNotes('G4'));
  assert.deepEqual(song.notes.map((n) => n.midi), [67, 67, 67]);
  assert.throws(() => sing('ˈa', []));
});

test('the voice is the speaker: a different base pitch sings the same notes', () => {
  const at = (f0) => { const s = sing('ˈa', parseNotes('A4'), { f0 }); return pitchAt(s.score, (s.notes[0].start + s.notes[0].end) / 2); };
  assert.ok(Math.abs(at(110) - 440) < 1 && Math.abs(at(200) - 440) < 1);
});
