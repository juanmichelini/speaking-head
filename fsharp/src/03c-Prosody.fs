// # Prosody: pitch over time, in one unit (in F#)
//
// Stress, tone, intonation and melody look like four different things, but they are one: **pitch over time**,
// plus how long each syllable lasts. A stressed Spanish syllable is a small bump of pitch. A Mandarin tone is a
// contour on a syllable. A question is a rise at the end of the phrase. A melody is a pitch for every syllable.
// This file gives them one unit and one way to be written, so each can be said in terms of the others. It is
// the same as `lib/prosody.js`.
//
// ## The unit: semitones
//
// Pitch is a ratio (twice the frequency is an octave), so it is measured as a distance from a base pitch, in
// **semitones**: twelve to the octave, the same for a bass and a soprano. `0` is the base pitch, `12` is an
// octave above, `-12` an octave below. `hzAt 130.0 2.0` is the frequency two semitones above 130 Hz.
//
// ## Where pitch comes from
//
// A syllable's pitch is a **contour**: a list of semitone offsets spread evenly across the vowel (one number is
// a steady pitch). Three things put numbers in it:
//
// - **Stress** is a bump: primary stress a little higher than secondary, about 1.7 and 0.8 semitones.
// - **Tone** is the Chao levels, 5 high to 1 low, with 3 at the speaker's own pitch. Each level is a fixed step
//   of 0.12 octave, 1.44 semitones.
// - They add: a stressed syllable with a tone sits on top of the tone's contour.
//
// `range` scales all of it. A lively voice has a range above 1, a flat one near 0, a whisper 0.
//
// ## The phrase line
//
// Under all the syllables there is one slower line: the pitch of the phrase itself. A statement drifts down, a
// question lifts at the end. A **line** is a function from how far through the phrase we are (0 to 1) to
// semitones, and `applyLine` adds it to every frame of a score. `declination amount` is the drift of a
// statement: pitch falls by the fraction `amount` over the phrase.
module IpaTrombone.Prosody

open IpaTrombone.Score

let ratioOf (semitones: float) : float = 2.0 ** (semitones / 12.0)

let semitonesOf (ratio: float) : float = 12.0 * (System.Math.Log ratio / System.Math.Log 2.0)

let hzAt (basePitch: float) (semitones: float) : float = basePitch * ratioOf semitones

/// Octaves per tone level.
let toneStep : float = 0.12

/// The pitch bump of no stress, secondary stress and primary stress, in semitones.
let stressBump : float list = [ 0.0; semitonesOf 1.05; semitonesOf 1.1 ]

let levelSemitones (step: float) (level: int) : float = float (level - 3) * step * 12.0

/// A syllable's pitch contour in semitones: the stress bump plus the tone's levels, all scaled by `range`.
let contourOf (step: float) (range: float) (stress: int) (tone: int list option) : float list =
    let bump = List.tryItem stress stressBump |> Option.defaultValue 0.0
    match tone with
    | Some levels -> levels |> List.map (fun level -> (bump + levelSemitones step level) * range)
    | None -> [ bump * range ]

/// The drift of a statement: pitch falls by the fraction `amount` over the phrase.
let declination (amount: float) (u: float) : float = semitonesOf (max 0.01 (1.0 - amount * u))

/// Add a phrase line to every frame of a score, by how far through the score the frame is.
let applyLine (line: float -> float) (score: Score) : Score =
    let total = if score.Duration = 0.0 then 1.0 else score.Duration
    { score with
        Keyframes =
            score.Keyframes
            |> List.map (fun k -> { k with Frame = { k.Frame with F0 = hzAt k.Frame.F0 (line (k.T / total)) } }) }
