// # Demo 4: Languages
//
// The new idea here is not acoustic, it is **lookup**: turn the words a person types into IPA,
// and let Demo 3's planner do the rest. The page has four jobs:
//
// - load the dictionary of the chosen language (a text file, fetched once and remembered)
// - convert the text with `textToIpa`, and show each word beside its IPA and where it came from
// - say the result, with the tract following
// - list the dictionary, so there is always something to click on
//
// Every language goes through the same engine. A French word and a Russian word differ only in
// the IPA that the dictionary gives.
import { LANGUAGES, languageByCode, loadDictionary, textToIpa } from '../../lib/languages.js';
import { plan, markAt } from '../../lib/planner.js';
import { DEFAULT_FRAME } from '../../lib/score.js';
import { shapeOf } from '../../lib/tractshape.js';
import { drawTract } from '../../lib/ui/tractview.js';
import { createShell, round } from '../../lib/ui/lesson-shell.js';
import { t, tp } from '../../lib/i18n.js';

const $ = (id) => document.getElementById(id);
const dictionaries = new Map();
let current = null;
const state = { code: 'en' };
// The shared shell (`lib/ui/lesson-shell.js`) keeps the pitch and does the sound.
const shell = createShell({
  onControl: () => convert(),
  downloadScore: () => current && current.score,
  downloadName: (s) => `${state.code}-${round(s.f0)}hz.wav`,
});

// ## Dictionaries
async function dictionary(code) {
  if (!dictionaries.has(code)) dictionaries.set(code, await loadDictionary(code));
  return dictionaries.get(code);
}

// ## Converting what was typed
//
// Done on every change, and cheap. Each row shows the word, its IPA, and `dictionary`, `rules` or
// `unknown`, so it is clear which words are looked up and which are guessed.
async function convert() {
  const language = languageByCode(state.code);
  let entries;
  try { entries = await dictionary(state.code); } catch (error) { $('status').textContent = error.message; return; }
  const result = textToIpa($('text').value, entries, language);
  const body = $('words').tBodies[0];
  body.replaceChildren();
  for (const w of result.words) {
    const row = body.insertRow();
    row.insertCell().textContent = w.word;
    const ipa = row.insertCell();
    ipa.textContent = w.ipa ? `/${w.ipa}/` : '—';
    ipa.style.fontFamily = 'var(--ipa)';
    row.insertCell().textContent = t(`lang.src.${w.source}`);
  }
  const missing = result.words.filter((w) => !w.ipa).map((w) => w.word);
  $('missing').textContent = missing.length ? t('lang.missing', { language: language.name, words: missing.join(', ') }) : '';
  current = plan(result.ipa, { f0: shell.state.f0 });
  current.text = result.ipa;
}

// ## Choosing a language
async function useLanguage(code) {
  state.code = code;
  const language = languageByCode(code);
  $('text').value = language.sample;
  $('text').lang = code;
  const entries = await dictionary(code).catch(() => new Map());
  const list = $('dictionary');
  list.replaceChildren();
  for (const [word] of entries) {
    const b = document.createElement('button');
    b.textContent = word;
    b.style.fontSize = '.95rem';
    b.addEventListener('click', () => { $('text').value = word; convert().then(say); });
    list.append(b);
  }
  await convert();
}

// ## Saying it
async function say() {
  if (!current || !current.text) return;
  const p = current;
  await shell.play(p.score, (frame, time) => {
    drawTract($('tract'), shapeOf(frame));
    const m = markAt(p.marks, time);
    if (m) $('readout').textContent = t('lang.now', { ipa: p.text, symbol: m.symbol });
  });
}
$('readout').style.whiteSpace = 'pre-line';

// ## Controls
for (const l of LANGUAGES) {
  const o = document.createElement('option');
  o.value = l.code;
  o.textContent = `${l.name} · ${l.native}`;
  $('language').append(o);
}
$('language').addEventListener('change', (e) => useLanguage(e.target.value));
$('text').addEventListener('input', convert);
$('say').addEventListener('click', say);
drawTract($('tract'), shapeOf(DEFAULT_FRAME));
useLanguage('en');
