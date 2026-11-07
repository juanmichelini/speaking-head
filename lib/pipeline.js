// # Everything, in one function
//
// Lessons 4 to 8 each change one stage of the same chain, and each plugs into lesson 3's planner on its own:
//
// ```
// text ─▶ IPA ─▶ accent rules ─▶ rhythm ─▶ plan, at a rate ─▶ voice ─▶ score
//  (4)           (8)             (7)       (3, 6)              (5)
// ```
//
// This is the whole chain, with nothing added: every line below is a call into one of those lessons, so a change
// to any stage is heard here too.
//
// - `language` and `entries` (a loaded dictionary) turn the words into IPA (lesson 4)
// - `accent`, if there is one, rewrites that IPA (lesson 8)
// - `rhythm` is `'stress'`, `'syllable'`, `'none'` or `'language'`, which takes the accent's rhythm if it names
//   one and the language's otherwise (lesson 7)
// - `rate` is how fast, 1 being natural (lesson 6)
// - `voice` is who is speaking (lesson 5)
//
// It returns what `speak` returns (the score and the tract length to play it with), plus what happened on the
// way: the IPA before and after the accent, the words the dictionary did not know, and the rhythm used.
import { textToIpa } from './languages.js';
import { applyAccent } from './accents.js';
import { rhythmPlan } from './rhythm.js';
import { speak } from './voices.js';

// The rhythm mode to use: a named one, none at all, or the one the accent (else the language) asks for.
export function chooseRhythm(rhythm, accent, language) {
  if (rhythm === 'none') return null;
  if (rhythm === 'stress' || rhythm === 'syllable') return rhythm;
  return (accent && accent.rhythm) || (language && language.rhythm) || null;
}

export function speakText(text, { entries, language, accent = null, rhythm = 'language', rate = 1, voice }) {
  const heard = textToIpa(text, entries, language);
  const ipa = accent ? applyAccent(heard.ipa, accent).ipa : heard.ipa;
  const mode = chooseRhythm(rhythm, accent, language);
  const overrides = mode ? rhythmPlan(ipa, mode).overrides : {};
  const speech = speak(ipa, voice, {}, { rate, overrides });
  return { ...speech, before: heard.ipa, ipa, words: heard.words, rhythm: mode };
}
