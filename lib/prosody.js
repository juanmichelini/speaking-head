// # Prosody: pitch over time, in one unit
//
// Stress, tone, intonation and melody look like four different things, but they are one: **pitch over time**,
// plus how long each syllable lasts. A stressed Spanish syllable is a small bump of pitch. A Mandarin tone is a
// contour on a syllable. A question is a rise at the end of the phrase. A melody is a pitch for every syllable.
// This file gives them one unit and one way to be written, so each can be said in terms of the others.
//
// ## The unit: semitones
//
// Pitch is a ratio (twice the frequency is an octave), so it is measured as a distance from a base pitch, in
// **semitones**: twelve to the octave, the same for a bass and a soprano. `0` is the base pitch, `12` is an
// octave above, `-12` an octave below. `hzAt(130, 2)` is the frequency two semitones above 130 Hz.
export const ratioOf = (semitones) => Math.pow(2, semitones / 12);
export const semitonesOf = (ratio) => 12 * Math.log2(ratio);
export const hzAt = (base, semitones) => base * ratioOf(semitones);

// ## Where pitch comes from
//
// A syllable's pitch is a **contour**: a list of semitone offsets spread evenly across the vowel (one number is a
// steady pitch). Three things put numbers in it:
//
// - **Stress** is a bump: primary stress a little higher than secondary, about 1.7 and 0.8 semitones.
// - **Tone** is the Chao levels, 5 high to 1 low, with 3 at the speaker's own pitch. Each level is a fixed step of
//   0.12 octave, 1.44 semitones.
// - They add: a stressed syllable with a tone sits on top of the tone's contour.
//
// `range` scales all of it. A lively voice has a range above 1, a flat one near 0, a whisper 0.
export const TONE_STEP = 0.12;                                  // octaves per tone level
export const STRESS_BUMP = [0, semitonesOf(1.05), semitonesOf(1.1)];   // none, secondary, primary

export const levelSemitones = (level, step = TONE_STEP) => (level - 3) * step * 12;

export function contourOf({ stress = 0, tone = null }, range = 1, step = TONE_STEP) {
  const bump = STRESS_BUMP[stress] ?? 0;
  return (tone || [3]).map((level) => (bump + (tone ? levelSemitones(level, step) : 0)) * range);
}

// ## The phrase line
//
// Under all the syllables there is one slower line: the pitch of the phrase itself. A statement drifts down, a
// question lifts at the end. A **line** is a function from how far through the phrase we are (0 to 1) to
// semitones, and `applyLine` adds it to every frame of a score.
//
// `declination(amount)` is the drift of a statement: pitch falls by the fraction `amount` over the phrase.
export const declination = (amount) => (u) => semitonesOf(Math.max(0.01, 1 - amount * u));

export function applyLine(score, line) {
  const total = score.duration || 1;
  const keyframes = score.keyframes.map((k) => ({ ...k, f0: hzAt(k.f0, line(k.t / total)) }));
  return { keyframes, duration: score.duration };
}

// A phrase line is built from simple ones. `rise(semitones, from)` is nothing until `from` of the way through
// the phrase and then lifts smoothly by `semitones` by the end; `plus` adds lines together.
export const rise = (semitones, from = 0.75) => (u) => {
  if (u <= from) return 0;
  const x = (u - from) / (1 - from);
  return semitones * x * x * (3 - 2 * x);
};
export const plus = (...lines) => (u) => lines.reduce((sum, line) => sum + line(u), 0);

// The named ones. A statement drifts down; a question drifts down a little less and lifts at the end; a flat
// line does not move at all.
export const LINES = {
  statement: declination(0.08),
  question: plus(declination(0.03), rise(5, 0.75)),
  flat: () => 0,
};
