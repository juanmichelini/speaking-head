// # Where a syllable begins (in F#)
//
// Two parts of the project cut words into syllables. `G2p` does it while spelling a word, to find where the
// stress goes, and it knows its language's consonant clusters. `Rhythms` does it on finished IPA, to time the
// speech, and knows nothing about any one language. They answer the same question at the heart of it: of the
// consonants between two vowels, how many go with the *next* syllable?
//
// The usual answer is the **maximal onset**: as many as can start a word. `a-stra`, not `as-tra`. What differs
// is only the test of what can start a word, so the rule lives here, under both, and each caller brings its own
// test. This is the same function as `lib/syllables.js`.
//
// `onsetLength canStart maxOnset consonants` takes the consonants between the vowels, in order, and returns how
// many of them, counted from the end, start the next syllable:
//
// - it grows the onset one consonant at a time, as long as `canStart` says the last few can begin a word
// - it stops at the first that cannot, and at `maxOnset`
// - what is left over (`consonants.Length - onset`) is the coda of the syllable before
module IpaTrombone.Syllables

let onsetLength (canStart: 'a list -> bool) (maxOnset: int) (consonants: 'a list) : int =
    let items = Array.ofList consonants
    let count = items.Length
    let rec grow (onset: int) : int =
        if onset < count && onset < maxOnset && canStart [ for x in count - onset - 1 .. count - 1 -> items.[x] ] then
            grow (onset + 1)
        else
            onset
    grow 0
