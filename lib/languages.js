// # Languages and their dictionaries
//
// This is the registry for Demo 4: ten languages, each with a small **word → IPA dictionary** kept
// as plain text in `data/dictionaries/<code>.tsv` (one `word<TAB>ipa` per line, `#` for comments).
// Adding a word is a one-line pull request.
//
// ## Which ten?
//
// The ten most spoken languages by total speakers (native and second-language together) are
// English, Mandarin Chinese, Hindi, Spanish, Modern Standard Arabic, French, Bengali, Portuguese,
// Russian and Urdu or Indonesian, depending on the count. Urdu and Hindi are one spoken language
// with two scripts, and Hindi is already here, so Indonesian takes the tenth place. English and
// Spanish are the two the experiment names; they get the most words.
//
// ## What a dictionary can and cannot do
//
// These are **seed** dictionaries: a few dozen common words each, hand-transcribed in a broad,
// phonemic style, enough to make the idea work. They are not pronunciation authorities. Where the
// engine has no sound for a feature (Russian palatalisation, Arabic emphatics, Hindi dental
// consonants and breathy voice), the nearest available sound is used and the file says so.
import { spanishToIpa, indonesianToIpa } from './g2p.js';

export const LANGUAGES = [
  { code: 'en', rhythm: 'stress', range: 1, drift: 1, name: 'English', native: 'English', rules: null, sample: 'hello world' },
  { code: 'es', rhythm: 'syllable', range: 0.8, drift: 1, name: 'Spanish', native: 'Español', rules: spanishToIpa, sample: 'hola mundo' },
  { code: 'zh', rhythm: 'syllable', range: 1, drift: 0.6, name: 'Mandarin Chinese', native: '普通话', rules: null, sample: 'ni3hao3' },
  { code: 'hi', rhythm: 'syllable', range: 0.7, drift: 1, name: 'Hindi', native: 'हिन्दी', rules: null, sample: 'namaste' },
  { code: 'ar', rhythm: 'stress', range: 0.9, drift: 1, name: 'Arabic (Standard)', native: 'العربية', rules: null, sample: 'marhaban salaam' },
  { code: 'fr', rhythm: 'syllable', range: 0.5, drift: 1, name: 'French', native: 'Français', rules: null, sample: 'bonjour le monde' },
  { code: 'bn', rhythm: 'syllable', range: 0.7, drift: 1, name: 'Bengali', native: 'বাংলা', rules: null, sample: 'nomoshkar' },
  { code: 'pt', rhythm: 'stress', range: 0.9, drift: 1, name: 'Portuguese (Brazil)', native: 'Português', rules: null, sample: 'olá mundo' },
  { code: 'ru', rhythm: 'stress', range: 1.1, drift: 1, name: 'Russian', native: 'Русский', rules: null, sample: 'привет мир' },
  { code: 'id', rhythm: 'syllable', range: 0.6, drift: 1, name: 'Indonesian', native: 'Bahasa Indonesia', rules: indonesianToIpa, sample: 'halo dunia' },
];

export function languageByCode(code) {
  return LANGUAGES.find((l) => l.code === code) || null;
}

// ## Prosody as data
//
// Every language is timed (`rhythm`, below) and has a pitch line, and the two numbers here say how much of the
// pitch movement it uses. They are settings for the model, not measurements: tune them by ear.
//
// - `range` multiplies the voice's pitch range, which scales every stress bump and tone contour (`prosody.js`).
//   A language that marks stress strongly with pitch (Russian, English) is above 1; one with weak or no lexical
//   stress (French, Indonesian) is well below.
// - `drift` multiplies the voice's own downward drift over a statement. Mandarin is lower, so the fall does not
//   flatten the lexical tones that sit on top of it.
//
// Tone itself is not a setting: Mandarin's dictionary spells its tones as Chao letters, and lesson 3 turns
// those into contours. Stress is not a setting either: a `ˈ` in the IPA is a stress. What a language *does with*
// those marks is what this table adds.
//
// ## Rhythm class
//
// Each language is tagged `stress` or `syllable` for Demo 7. This is the traditional classification
// and a simplification: real languages sit on a spectrum (Brazilian Portuguese and Arabic are the
// ones most often argued about, and Hindi and Bengali are sometimes called mora-timed). The tag
// only chooses the default; the demo lets you override it.

// ## Reading a dictionary file
export function parseDictionary(text) {
  const entries = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [word, ipa] = line.split('\t');
    if (word && ipa) entries.set(normalizeWord(word), ipa.trim());
  }
  return entries;
}

// Lower case, and with punctuation stripped from the ends. Interior apostrophes and hyphens stay.
export function normalizeWord(word) {
  return word.normalize('NFC').toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

const stripAccents = (w) => w.normalize('NFD').replace(/\p{M}/gu, '');

// ## Words to IPA
//
// For each word, try the dictionary, then the same word without accents (so `dias` finds `días`),
// then the language's spelling rules if it has them. A word nothing knows is reported rather than
// guessed, so the page can say which words were skipped.
export function lookupWord(word, entries, language) {
  const key = normalizeWord(word);
  if (!key) return null;
  if (entries.has(key)) return { word, ipa: entries.get(key), source: 'dictionary' };
  const plain = stripAccents(key);
  for (const [k, v] of entries) if (stripAccents(k) === plain) return { word, ipa: v, source: 'dictionary' };
  if (language && language.rules && /^[\p{L}]+$/u.test(key)) return { word, ipa: language.rules(key), source: 'rules' };
  return { word, ipa: null, source: 'unknown' };
}

export function textToIpa(text, entries, language) {
  const words = text.split(/\s+/).filter(Boolean).map((w) => lookupWord(w, entries, language)).filter(Boolean);
  const known = words.filter((w) => w.ipa);
  return { ipa: known.map((w) => w.ipa).join(' '), words };
}

// ## Loading in the browser
//
// Relative to this file, so the same code works on any host path.
export async function loadDictionary(code, fetchImpl = fetch) {
  const url = new URL(`../data/dictionaries/${code}.tsv`, import.meta.url);
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`could not load the ${code} dictionary (${response.status})`);
  return parseDictionary(await response.text());
}
