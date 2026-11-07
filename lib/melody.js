// # Melody: a note for every syllable
//
// A song is the same thing as speech with the two big choices made by someone else: **which pitch** each syllable
// is sung on, and **how long** it lasts. Those are exactly the two things `prosody.js` and `rhythm.js` already
// control, so singing needs no new machinery. A note is a pitch (a piece of music writes it as a letter and
// octave, `A4` being 440 Hz) and a length in beats. This file does three small jobs:
//
// 1. read notes: `'C4 D4:1 E4:2'` is three notes, the number after the colon being the beats (1 if left out)
// 2. give each syllable the length of its note (the same `fitDurations` the rhythm lesson uses, so consonants
//    squeeze and vowels take the rest)
// 3. put the pitch of each note under its syllable, as a line in semitones with a short glide between notes
//
// A note's pitch is a distance in semitones from the speaker's base pitch, which is the unit lesson 3 already uses
// for stress, tone and intonation. Singing is those four ideas switched off, and one more switched on.
import { planWithLine } from './planner.js';
import { syllabify, fitDurations } from './rhythm.js';
import { applyLine, semitonesOf } from './prosody.js';

// ## Reading notes
//
// MIDI numbers count semitones, with 60 as middle C and 69 as A4 (440 Hz). A name is a letter, an optional `#` or
// `b`, and an octave: `C4`, `F#3`, `Bb4`.
const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiOf(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(name).trim());
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + LETTERS[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export const midiOfHz = (hz) => 69 + semitonesOf(hz / 440);

// Words that are not notes (or notes with a bad length) are left out, so a half-typed melody still plays.
export function parseNotes(text) {
  const notes = [];
  for (const word of String(text).split(/\s+/)) {
    const [name, length] = word.split(':');
    const midi = midiOf(name);
    const beats = length === undefined ? 1 : Number(length);
    if (midi !== null && beats > 0) notes.push({ midi, beats });
  }
  return notes;
}

// ## The pitch line
//
// Given when each syllable is sounding and the semitone offset of its note, the line holds a note's pitch while its
// syllable sounds and glides to the next one across a short gap centred on the boundary. It is a function of
// time in seconds; `sing` turns it into the function of "how far through" that `applyLine` wants.
export function noteLine(spans, semitones, glide = 0.06) {
  return (t) => {
    const last = spans.length - 1;
    if (last < 0) return 0;
    for (let n = 0; n < last; n++) {
      const edge = (spans[n].end + spans[n + 1].start) / 2;
      if (t < edge - glide / 2) return semitones[n];
      if (t < edge + glide / 2) {
        const x = (t - (edge - glide / 2)) / glide;
        return semitones[n] + (semitones[n + 1] - semitones[n]) * x * x * (3 - 2 * x);
      }
    }
    return semitones[last];
  };
}

// ## Singing
//
// Syllable `n` is sung on note `n`; if there are fewer notes than syllables the last note carries on. The planner
// runs with `range: 0` (no stress bumps) and a flat phrase line, because the melody supplies all the pitch, and
// each syllable lasts its note's beats at `bpm` beats a minute.
//
// Returns the plan (`score`, `marks`, `duration`) plus `notes`: for each syllable, its `midi` pitch and the
// `start` and `end` time it sounds, which is what a display needs to draw them.
export function sing(ipa, notes, { bpm = 100, f0 = 130, ...options } = {}) {
  if (notes.length === 0) throw new Error('a melody needs at least one note');
  const syllables = syllabify(ipa);
  const noteFor = (n) => notes[Math.min(n, notes.length - 1)];
  const durations = syllables.map((_, n) => (noteFor(n).beats * 60) / bpm);
  const overrides = fitDurations(ipa, syllables, durations, 0);
  const planned = planWithLine(ipa, () => 0, { ...options, f0, overrides, range: 0 });

  // When each syllable sounds: from its first sound to its last.
  let before = 0;
  const spans = syllables.map((s) => {
    const own = planned.marks.filter((m) => s.segments.includes(m.index));
    const span = own.length
      ? { start: Math.min(...own.map((m) => m.start)), end: Math.max(...own.map((m) => m.end)) }
      : { start: before, end: before };
    before = span.end;
    return span;
  });
  const base = midiOfHz(f0);
  const semitones = syllables.map((_, n) => noteFor(n).midi - base);
  const track = noteLine(spans, semitones);
  const score = applyLine(planned.score, (u) => track(u * planned.score.duration));
  return {
    score, marks: planned.marks, duration: score.duration,
    notes: syllables.map((_, n) => ({ midi: noteFor(n).midi, ...spans[n] })),
  };
}
