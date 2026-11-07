// # Melody: a note for every syllable (in F#)
//
// The same file as `lib/melody.js`. A song is speech with the two big choices made by someone else: which pitch
// each syllable is sung on, and how long it lasts. Those are what `Prosody` and `Rhythms` already control, so
// singing needs no new machinery. A note is a pitch (`A4` is 440 Hz) and a length in beats; this file reads notes,
// gives each syllable the length of its note with `fitDurations`, and puts each note's pitch under its syllable
// as a line in semitones with a short glide between notes.
module IpaTrombone.Melody

open IpaTrombone.Planner
open IpaTrombone.Prosody
open IpaTrombone.Rhythms

/// A pitch (MIDI number: 60 is middle C, 69 is A4 at 440 Hz) held for some beats.
type Note = { Midi: int; Beats: float }

/// A note as sung: its pitch and the time its syllable sounds.
type SungNote = { Midi: int; Start: float; End: float }

type Song =
    { Plan: Plan
      Notes: SungNote list }

let private letterOffset (c: char) : int option =
    match System.Char.ToUpper c with
    | 'C' -> Some 0
    | 'D' -> Some 2
    | 'E' -> Some 4
    | 'F' -> Some 5
    | 'G' -> Some 7
    | 'A' -> Some 9
    | 'B' -> Some 11
    | _ -> None

/// `C4`, `F#3`, `Bb4`: a letter, an optional `#` or `b`, and a one-digit octave (optionally negative).
let midiOf (name: string) : int option =
    let name = name.Trim()
    if name.Length < 2 then
        None
    else
        match letterOffset name.[0] with
        | None -> None
        | Some letter ->
            let accidental, rest =
                match name.[1] with
                | '#' -> 1, name.Substring 2
                | 'b' -> -1, name.Substring 2
                | _ -> 0, name.Substring 1
            match System.Int32.TryParse rest with
            | true, octave when rest.Length > 0 && (rest = string octave) -> Some(12 * (octave + 1) + letter + accidental)
            | _ -> None

let midiOfHz (hz: float) : float = 69.0 + semitonesOf (hz / 440.0)

/// Words that are not notes (or have a bad length) are left out, so a half-typed melody still plays.
let parseNotes (text: string) : Note list =
    text.Split([| ' '; '\t'; '\n' |], System.StringSplitOptions.RemoveEmptyEntries)
    |> Array.toList
    |> List.choose (fun word ->
        let parts = word.Split ':'
        let beats =
            if parts.Length < 2 then
                Some 1.0
            else
                match System.Double.TryParse(parts.[1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture) with
                | true, b -> Some b
                | _ -> None
        match midiOf parts.[0], beats with
        | Some midi, Some b when b > 0.0 -> Some({ Midi = midi; Beats = b }: Note)
        | _ -> None)

/// Holds a note's pitch while its syllable sounds and glides to the next across a short gap centred on the boundary.
/// A function of time in seconds.
let noteLine (glide: float) (spans: (float * float) list) (semitones: float list) (t: float) : float =
    let spans = List.toArray spans
    let semitones = List.toArray semitones
    let last = spans.Length - 1
    if last < 0 then
        0.0
    else
        let rec go n =
            if n >= last then
                semitones.[last]
            else
                let edge = (snd spans.[n] + fst spans.[n + 1]) / 2.0
                if t < edge - glide / 2.0 then semitones.[n]
                elif t < edge + glide / 2.0 then
                    let x = (t - (edge - glide / 2.0)) / glide
                    semitones.[n] + (semitones.[n + 1] - semitones.[n]) * x * x * (3.0 - 2.0 * x)
                else go (n + 1)
        go 0

/// Sing `ipa` on `notes` at `bpm` beats a minute. Syllable n is sung on note n; the last note carries on if there
/// are fewer notes than syllables. `adjust` sets the speaker (pitch, tenseness) as for the planner.
let sing (bpm: float) (adjust: PlanOptions -> PlanOptions) (ipa: string) (notes: Note list) : Song =
    if List.isEmpty notes then failwith "a melody needs at least one note"
    let syllables = syllabify ipa
    let noteFor (n: int) = List.item (min n (List.length notes - 1)) notes
    let durations = syllables |> List.mapi (fun n _ -> (noteFor n).Beats * 60.0 / bpm)
    let overrides = fitDurations ipa syllables durations 0.0
    let chosen = adjust defaultPlanOptions
    let options = { chosen with Overrides = overrides; Range = 0.0 }
    let planned = planWith (fun _ -> 0.0) options ipa
    let spans =
        syllables
        |> List.fold
            (fun (acc: (float * float) list) s ->
                let own = planned.Marks |> List.filter (fun m -> List.contains m.Index s.Segments)
                let span =
                    if List.isEmpty own then
                        let before = match List.tryLast acc with Some(_, e) -> e | None -> 0.0
                        (before, before)
                    else
                        (own |> List.map (fun m -> m.Start) |> List.min, own |> List.map (fun m -> m.End) |> List.max)
                acc @ [ span ])
            []
    let b = midiOfHz options.F0
    let semitones = syllables |> List.mapi (fun n _ -> float (noteFor n).Midi - b)
    let track = noteLine 0.06 spans semitones
    let score = applyLine (fun u -> track (u * planned.Score.Duration)) planned.Score
    { Plan = { planned with Score = score; Duration = score.Duration }
      Notes = spans |> List.mapi (fun n (s, e) -> ({ Midi = (noteFor n).Midi; Start = s; End = e }: SungNote)) }
