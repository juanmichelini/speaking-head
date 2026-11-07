// # How the lessons compose
//
// The whole project is one chain, and every lesson takes one link of it:
//
// ```
// symbols ─▶ coordinates ─▶ frame numbers ─▶ score over time ─▶ samples
//  (IPA)     (small ranges)   (about 22)      (keyframes)        (the engine)
// ```
//
// - **Coordinates** are a few numbers in a range: a vowel is backness, height and rounding (each 0 to 1); a
//   consonant is a manner (a category), a voicing (0 or 1) and a place (13.5 at the throat to 43.5 at the lips).
//   An IPA symbol is a named point in those spaces.
// - A **frame** is the flat set of numbers the engine understands (tongue, lips, velum, constrictions, noise,
//   pitch, tenseness). A **score** is frames at times, blended between.
// - The **engine** turns a score into samples.
//
// A simple lesson fixes most coordinates and frees one, so you can hear what that one number does. A complex
// lesson takes the output of simpler ones and adds a stage. This file says, for each lesson, what goes in, what
// range it works over, what comes out and which lessons it stands on. A test checks it against the code: every
// lesson is described, every file named exists, and no module imports from a layer above its own.
// `scripts/composition-doc.mjs` writes it out as `docs/composition.md`.

// ## The layers
//
// Every module in `lib/` sits on a level, and may import only from levels below it. This is what "bottom up"
// means in the code. A module that is not listed here fails the test, so a new one has to be placed on purpose.
export const LAYERS = {
  0: ['pinktrombone', 'score', 'vowels', 'vowel-fit', 'syllables', 'i18n', 'literate', 'demos', 'composition', 'worklet'],
  1: ['render', 'analysis', 'tractshape', 'vowel-map', 'consonants', 'g2p'],
  2: ['audio', 'between', 'ipa'],
  3: ['planner', 'accents'],
  4: ['voices', 'rhythm', 'languages'],
  5: ['pipeline'],
};

export const levelOf = (module) => Number(Object.keys(LAYERS).find((level) => LAYERS[level].includes(module)));

// ## The lessons
//
// `slug` matches `lib/demos.js`. `from` is the lessons it stands on (by number). `files` are the files to read.
// The three prose fields are: what the lesson takes in (`input`), the numbers it works over (`range`) and what
// it hands on (`output`).
const SHAPE = 'tongue index 12–29, tongue diameter 2.05–3.5, lips 0.6–1.5 (a frame, with F1 and F2 as the check)';
const SLICE = 'a frame with a constriction at the place (index, gap, noise), velum and voicing';
const PLACE = 'place 13.5 (throat) to 43.5 (lips)';

export const LESSONS = [
  { n: '1.1', slug: '01.1-front-to-back', input: 'close vowels, lips spread (i ɨ ɯ)', range: 'backness 0–1; height 0 and rounding 0 held', output: SHAPE, from: [], files: ['lib/vowels.js', 'lib/vowel-map.js', 'lib/ui/vowel-lesson.js'] },
  { n: '1.2', slug: '01.2-rounded-front-to-back', input: 'close vowels, lips rounded (y ʉ u)', range: 'backness 0–1; height 0 and rounding 1 held', output: SHAPE, from: ['1.1'], files: ['lib/vowel-map.js', 'lib/ui/vowel-lesson.js'] },
  { n: '1.3', slug: '01.3-spread-vowels', input: 'every spread vowel', range: 'backness 0–1, height 0–1; rounding 0 held', output: SHAPE, from: ['1.1'], files: ['lib/vowel-map.js', 'lib/ui/vowel-lesson.js'] },
  { n: '1.4', slug: '01.4-rounded-vowels', input: 'every rounded vowel', range: 'backness 0–1, height 0–1; rounding 1 held', output: SHAPE, from: ['1.2', '1.3'], files: ['lib/vowel-map.js', 'lib/ui/vowel-lesson.js'] },
  { n: '1', slug: '01-vowels', input: 'the whole vowel chart', range: 'backness 0–1, height 0–1, rounding 0–1', output: SHAPE, from: ['1.3', '1.4'], files: ['lib/vowels.js', 'lib/vowel-fit.js', 'lib/vowel-map.js', 'fsharp/src/01-TongueSpace.fs', 'fsharp/src/03a-VowelShape.fs'] },
  { n: '2.1', slug: '02.1-voiceless-fricatives', input: 'voiceless fricatives', range: `${PLACE}; manner and voicing held`, output: SLICE, from: ['1'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2.2', slug: '02.2-voiced-fricatives', input: 'voiced fricatives', range: `${PLACE}; voicing on`, output: SLICE, from: ['2.1'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2.3', slug: '02.3-voiceless-stops', input: 'voiceless stops', range: `${PLACE}; gap 0 (closed)`, output: SLICE, from: ['1'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2.4', slug: '02.4-voiced-stops', input: 'voiced stops', range: `${PLACE}; voicing on`, output: SLICE, from: ['2.3'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2.5', slug: '02.5-nasals', input: 'nasals', range: `${PLACE}; velum 0.4–0.6`, output: SLICE, from: ['2.4'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2.6', slug: '02.6-approximants', input: 'approximants', range: `${PLACE}; gap too wide to hiss`, output: SLICE, from: ['2.2'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2.7', slug: '02.7-laterals', input: 'laterals', range: `${PLACE}; air round the tongue`, output: SLICE, from: ['2.6'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2.8', slug: '02.8-trills-and-taps', input: 'trills and taps', range: `${PLACE}; a flutter or a single flick`, output: SLICE, from: ['2.6'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2.9', slug: '02.9-affricates', input: 'affricates', range: `${PLACE}; a stop released into a fricative`, output: SLICE, from: ['2.1', '2.3'], files: ['lib/consonants.js', 'lib/ui/consonant-lesson.js'] },
  { n: '2', slug: '02-consonants', input: 'the whole pulmonic table', range: 'manner (a category) × voicing 0/1 × place 13.5–43.5', output: 'a frame, or a score (closure, burst, release), with the carrier vowel taken from lesson 1', from: ['1', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9'], files: ['lib/consonants.js', 'lib/between.js', 'fsharp/src/02a-Score.fs', 'fsharp/src/02b-Consonants.fs'] },
  { n: '3.1', slug: '03.1-tones', input: 'one vowel and a tone (Chao letters ˥˦˧˨˩)', range: 'level 1–5, up to three per contour; each level 0.12 octave around your pitch', output: 'a score whose only movement is f0', from: ['1'], files: ['lib/ipa.js', 'lib/planner.js', 'lib/ui/tonepad.js'] },
  { n: '3', slug: '03-together', input: 'an IPA string (vowels, consonants, stress, length, tone)', range: 'the symbols of lessons 1 and 2, plus marks', output: 'a score: each sound\'s gesture, the tongue steered from the last vowel to the next', from: ['1', '2', '3.1'], files: ['lib/ipa.js', 'lib/planner.js', 'fsharp/src/03b-Ipa.fs', 'fsharp/src/03c-Planner.fs'] },
  { n: '4', slug: '04-languages', input: 'text in one of ten languages', range: 'a word list per language, or spelling rules (Spanish, Indonesian)', output: 'an IPA string, which is lesson 3\'s input', from: ['3'], files: ['lib/languages.js', 'lib/g2p.js', 'lib/syllables.js', 'fsharp/src/04a-G2p.fs', 'fsharp/src/04b-Languages.fs'] },
  { n: '5', slug: '05-voices', input: 'a voice: tract length, pitch, tenseness, vibrato, jitter, range', range: 'tract 9.5–26 cm, pitch 50–600 Hz, tenseness 0.1–1', output: 'lesson 3\'s score with another speaker, plus the tract length the engine needs', from: ['3'], files: ['lib/voices.js', 'fsharp/src/05-Voices.fs'] },
  { n: '6', slug: '06-tempo', input: 'a rate', range: '0.4–3.5 times natural speed', output: 'the same speech with its timings scaled (consonants shrink less than vowels)', from: ['3'], files: ['lib/planner.js', 'fsharp/src/06-Tempo.fs'] },
  { n: '7', slug: '07-rhythm', input: 'a rhythm: stress-timed or syllable-timed', range: 'a duration per syllable', output: 'per-sound duration overrides for lesson 3\'s planner', from: ['3'], files: ['lib/rhythm.js', 'lib/syllables.js', 'fsharp/src/07-Rhythm.fs'] },
  { n: '8', slug: '08-accents', input: 'IPA and a set of rewrite rules', range: 'rules from one sound to another, in context', output: 'IPA again (then lesson 3), optionally timed by lesson 7', from: ['3', '7'], files: ['lib/accents.js', 'fsharp/src/08-Accents.fs'] },
  { n: '9', slug: '09-everything', input: 'text, a language, an accent, a rhythm, a rate and a voice', range: 'the ten languages and eight accents, rate 0.4–3.5, eleven voices', output: 'a score and the tract length to play it with, plus the IPA before and after the accent', from: ['3', '4', '5', '6', '7', '8'], files: ['lib/pipeline.js', 'fsharp/src/08b-Pipeline.fs'] },
];

// The engine has no page of its own: it is F# lesson 9 (`09a` to `09c`), where lessons 1 to 8 stop at a score.
// It takes a score and returns samples, so it sits under every page that makes sound.
export const FSHARP_ONLY = { n: 'F# 9', input: 'a score and render options', range: 'sample rate, tract length, seed', output: 'samples (float32)', from: ['3'], files: ['fsharp/src/09a-Glottis.fs', 'fsharp/src/09b-Tract.fs', 'fsharp/src/09c-Render.fs'] };

// ## As a document
export function compositionMarkdown() {
  const row = (l) => `| ${l.n} | ${l.input} | ${l.range} | ${l.output} | ${l.from.length ? l.from.join(', ') : 'nothing: the bottom'} |`;
  return `# How the lessons compose

*Generated from \`lib/composition.js\` by \`scripts/composition-doc.mjs\`; edit that file, not this one.*

Every lesson takes one link of one chain:

\`\`\`
symbols ─▶ coordinates ─▶ frame numbers ─▶ score over time ─▶ samples
 (IPA)     (small ranges)   (about 22)      (keyframes)        (the engine)
\`\`\`

A simple lesson fixes most coordinates and frees one. A complex lesson takes the output of simpler ones and
adds a stage.

| Lesson | Input | Range | Output | Built on |
|---|---|---|---|---|
${[...LESSONS, FSHARP_ONLY].map(row).join('\n')}

## Layers

A module may import only from a lower level.

${Object.entries(LAYERS).map(([level, modules]) => `- **${level}:** ${modules.map((m) => `\`${m}\``).join(', ')}`).join('\n')}
`;
}
