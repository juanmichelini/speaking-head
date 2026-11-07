# How the lessons compose

*Generated from `lib/composition.js` by `scripts/composition-doc.mjs`; edit that file, not this one.*

Every lesson takes one link of one chain:

```
symbols ─▶ coordinates ─▶ frame numbers ─▶ score over time ─▶ samples
 (IPA)     (small ranges)   (about 22)      (keyframes)        (the engine)
```

A simple lesson fixes most coordinates and frees one. A complex lesson takes the output of simpler ones and
adds a stage.

| Lesson | Input | Range | Output | Built on |
|---|---|---|---|---|
| 1.1 | close vowels, lips spread (i ɨ ɯ) | backness 0–1; height 0 and rounding 0 held | tongue index 12–29, tongue diameter 2.05–3.5, lips 0.6–1.5 (a frame, with F1 and F2 as the check) | nothing: the bottom |
| 1.2 | close vowels, lips rounded (y ʉ u) | backness 0–1; height 0 and rounding 1 held | tongue index 12–29, tongue diameter 2.05–3.5, lips 0.6–1.5 (a frame, with F1 and F2 as the check) | 1.1 |
| 1.3 | every spread vowel | backness 0–1, height 0–1; rounding 0 held | tongue index 12–29, tongue diameter 2.05–3.5, lips 0.6–1.5 (a frame, with F1 and F2 as the check) | 1.1 |
| 1.4 | every rounded vowel | backness 0–1, height 0–1; rounding 1 held | tongue index 12–29, tongue diameter 2.05–3.5, lips 0.6–1.5 (a frame, with F1 and F2 as the check) | 1.2, 1.3 |
| 1 | the whole vowel chart | backness 0–1, height 0–1, rounding 0–1 | tongue index 12–29, tongue diameter 2.05–3.5, lips 0.6–1.5 (a frame, with F1 and F2 as the check) | 1.3, 1.4 |
| 2.1 | voiceless fricatives | place 13.5 (throat) to 43.5 (lips); manner and voicing held | a frame with a constriction at the place (index, gap, noise), velum and voicing | 1 |
| 2.2 | voiced fricatives | place 13.5 (throat) to 43.5 (lips); voicing on | a frame with a constriction at the place (index, gap, noise), velum and voicing | 2.1 |
| 2.3 | voiceless stops | place 13.5 (throat) to 43.5 (lips); gap 0 (closed) | a frame with a constriction at the place (index, gap, noise), velum and voicing | 1 |
| 2.4 | voiced stops | place 13.5 (throat) to 43.5 (lips); voicing on | a frame with a constriction at the place (index, gap, noise), velum and voicing | 2.3 |
| 2.5 | nasals | place 13.5 (throat) to 43.5 (lips); velum 0.4–0.6 | a frame with a constriction at the place (index, gap, noise), velum and voicing | 2.4 |
| 2.6 | approximants | place 13.5 (throat) to 43.5 (lips); gap too wide to hiss | a frame with a constriction at the place (index, gap, noise), velum and voicing | 2.2 |
| 2.7 | laterals | place 13.5 (throat) to 43.5 (lips); air round the tongue | a frame with a constriction at the place (index, gap, noise), velum and voicing | 2.6 |
| 2.8 | trills and taps | place 13.5 (throat) to 43.5 (lips); a flutter or a single flick | a frame with a constriction at the place (index, gap, noise), velum and voicing | 2.6 |
| 2.9 | affricates | place 13.5 (throat) to 43.5 (lips); a stop released into a fricative | a frame with a constriction at the place (index, gap, noise), velum and voicing | 2.1, 2.3 |
| 2 | the whole pulmonic table | manner (a category) × voicing 0/1 × place 13.5–43.5 | a frame, or a score (closure, burst, release), with the carrier vowel taken from lesson 1 | 1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9 |
| 3.1 | one vowel and a tone (Chao letters ˥˦˧˨˩) | level 1–5, up to three per contour; each level 0.12 octave around your pitch | a score whose only movement is f0 | 1 |
| 3 | an IPA string (vowels, consonants, stress, length, tone) | the symbols of lessons 1 and 2, plus marks | a score: each sound's gesture, the tongue steered from the last vowel to the next | 1, 2, 3.1 |
| 4 | text in one of ten languages | a word list per language, or spelling rules (Spanish, Indonesian) | an IPA string, which is lesson 3's input | 3 |
| 5 | a voice: tract length, pitch, tenseness, vibrato, jitter, range | tract 9.5–26 cm, pitch 50–600 Hz, tenseness 0.1–1 | lesson 3's score with another speaker, plus the tract length the engine needs | 3 |
| 6 | a rate | 0.4–3.5 times natural speed | the same speech with its timings scaled (consonants shrink less than vowels) | 3 |
| 7 | a rhythm: stress-timed or syllable-timed | a duration per syllable | per-sound duration overrides for lesson 3's planner | 3 |
| 8 | IPA and a set of rewrite rules | rules from one sound to another, in context | IPA again (then lesson 3), optionally timed by lesson 7 | 3, 7 |
| 9 | text, a language, an accent, a rhythm, a rate and a voice | the ten languages and eight accents, rate 0.4–3.5, eleven voices | a score and the tract length to play it with, plus the IPA before and after the accent | 3, 4, 5, 6, 7, 8 |
| F# 9 | a score and render options | sample rate, tract length, seed | samples (float32) | 3 |

## Layers

A module may import only from a lower level.

- **0:** `pinktrombone`, `score`, `vowels`, `vowel-fit`, `syllables`, `prosody`, `i18n`, `literate`, `demos`, `composition`, `worklet`
- **1:** `render`, `analysis`, `tractshape`, `vowel-map`, `consonants`, `g2p`
- **2:** `audio`, `between`, `ipa`
- **3:** `planner`, `accents`
- **4:** `voices`, `rhythm`, `languages`
- **5:** `pipeline`
