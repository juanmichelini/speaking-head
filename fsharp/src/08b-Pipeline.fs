// # Everything, in one function (in F#)
//
// Lessons 4 to 8 each change one stage of the same chain, and each plugs into lesson 3's planner on its own:
//
//     text → IPA → accent rules → rhythm → plan, at a rate → voice → score
//     (4)          (8)            (7)       (3, 6)            (5)
//
// This is the whole chain, with nothing added: every line of `say` is a call into one of those lessons, so a
// change to any stage is heard here too. It is the same function as `lib/pipeline.js`.
module IpaTrombone.Pipeline

open IpaTrombone.Languages
open IpaTrombone.Planner
open IpaTrombone.Prosody
open IpaTrombone.Voices
open IpaTrombone.Rhythms
open IpaTrombone.Accents

/// Which rhythm to time the speech with: the accent's (else the language's), a named one, or none at all.
type RhythmChoice =
    | FromLanguage
    | Named of Rhythm
    | NoRhythm

/// What came out, and what happened on the way: the IPA before and after the accent, the words the dictionary
/// did not know, and the rhythm used.
type Said =
    { Speech: Speech
      Before: string
      Ipa: string
      Words: Lookup list
      Mode: Rhythm option }

let chooseRhythm (choice: RhythmChoice) (accent: Accent option) (language: Language) : Rhythm option =
    match choice with
    | NoRhythm -> None
    | Named mode -> Some mode
    | FromLanguage ->
        match accent |> Option.bind (fun (a: Accent) -> a.Rhythm) with
        | Some mode -> Some mode
        | None -> Some language.Rhythm

let say
    (language: Language)
    (entries: Dictionary)
    (accent: Accent option)
    (choice: RhythmChoice)
    (rate: float)
    (intonation: Intonation)
    (voice: Voice)
    (text: string)
    : Said =
    let heard = textToIpa (Some language) entries text
    let ipa =
        match accent with
        | Some a -> (applyAccent a heard.Ipa).Ipa
        | None -> heard.Ipa
    let mode = chooseRhythm choice accent language
    let overrides =
        match mode with
        | Some m -> (rhythmPlan m defaultRhythmOptions ipa).Overrides
        | None -> []
    // A statement keeps the voice's own drift; a question or a flat line replaces it.
    let line = if intonation = Statement then None else Some(lineOf intonation)
    let speech = speakLine line (fun o -> { o with Rate = rate; Overrides = overrides }) voice ipa
    { Speech = speech
      Before = heard.Ipa
      Ipa = ipa
      Words = heard.Words
      Mode = mode }
