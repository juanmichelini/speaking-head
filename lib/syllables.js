// # Where a syllable begins
//
// Two parts of the project cut words into syllables. `g2p.js` does it while spelling a word, to find where
// the stress goes, and it knows its language's consonant clusters. `rhythm.js` does it on finished IPA, to
// time the speech, and knows nothing about any one language. They answer the same question at the heart of
// it: of the consonants between two vowels, how many go with the *next* syllable?
//
// The usual answer is the **maximal onset**: as many as can start a word. `a-stra`, not `as-tra`. What
// differs is only the test of what can start a word, so the rule lives here, under both, and each caller
// brings its own test.
//
// `onsetLength(consonants, canStart, max)` takes the consonants between the vowels, in order, and returns how
// many of them, counted from the end, start the next syllable:
//
// - it grows the onset one consonant at a time, as long as `canStart` says the last few can begin a word
// - it stops at the first that cannot, and at `max`
// - what is left over (`consonants.length - onset`) is the coda of the syllable before
export function onsetLength(consonants, canStart, max = 3) {
  let onset = 0;
  while (onset < consonants.length && onset < max && canStart(consonants.slice(consonants.length - onset - 1))) onset++;
  return onset;
}
