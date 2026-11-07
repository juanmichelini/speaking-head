import test from 'node:test';
import assert from 'node:assert/strict';
import { speakText, chooseRhythm } from '../lib/pipeline.js';
import { languageByCode, textToIpa } from '../lib/languages.js';
import { parseAccent } from '../lib/accents.js';
import { voiceById, speak } from '../lib/voices.js';
import { rhythmPlan } from '../lib/rhythm.js';
import { plan } from '../lib/planner.js';

const es = languageByCode('es');
const entries = new Map();
const woman = voiceById('woman');

test('the pipeline is the chain of the lessons, and nothing more', () => {
  const heard = textToIpa('hola mundo', entries, es);
  const said = speakText('hola mundo', { entries, language: es, voice: woman });
  assert.equal(said.ipa, heard.ipa, 'with no accent the IPA is the language\'s');
  assert.equal(said.tractLength, woman.tractCm, 'the voice\'s tract goes with the score');
  assert.equal(said.rhythm, 'syllable', 'Spanish is syllable-timed');
  // It is exactly what the lessons give when called by hand.
  const byHand = speak(heard.ipa, woman, {}, { rate: 1, overrides: rhythmPlan(heard.ipa, 'syllable').overrides, range: woman.range * es.range, declination: (woman.declination ?? 0.08) * es.drift });
  assert.deepEqual(said.score, byHand.score);
});

test('rate, accent and rhythm each change the result in their own way', () => {
  const base = speakText('hola mundo', { entries, language: es, voice: woman });
  const fast = speakText('hola mundo', { entries, language: es, voice: woman, rate: 2 });
  assert.ok(fast.duration < base.duration, 'twice the rate is shorter');
  const accented = speakText('hola mundo', { entries, language: es, voice: woman, accent: parseAccent('o > u') });
  assert.notEqual(accented.ipa, accented.before);
  assert.equal(accented.before, base.ipa);
  const flat = speakText('hola mundo', { entries, language: es, voice: woman, rhythm: 'none' });
  assert.equal(flat.rhythm, null);
  assert.deepEqual(flat.score, plan(base.ipa, { f0: woman.f0, tenseness: woman.tenseness, range: woman.range * es.range, jitter: woman.jitter, vibratoDepth: woman.vibratoDepth, declination: (woman.declination ?? 0.08) * es.drift }).score);
});

test('the rhythm choice: a named one, none, or the accent\'s then the language\'s', () => {
  assert.equal(chooseRhythm('none', null, es), null);
  assert.equal(chooseRhythm('stress', null, es), 'stress');
  assert.equal(chooseRhythm('language', null, es), 'syllable');
  assert.equal(chooseRhythm('language', { rhythm: 'stress' }, es), 'stress', 'the accent wins');
  assert.equal(chooseRhythm('language', {}, es), 'syllable');
});

// How much pitch a language moves is data on the language (`languages.js`), applied here.
test('a language scales the voice\'s pitch movement: the same stressed IPA moves less in French than in Russian', () => {
  const peak = (code) => {
    const language = languageByCode(code);
    const said = speakText('ˈa ta ˈa', { entries: new Map([['ˈa ta ˈa', 'ˈa ta ˈa']]), language: { ...language, rules: (w) => w }, voice: voiceById('man'), rhythm: 'none' });
    const f = said.score.keyframes.filter((k) => k.intensity > 0).map((k) => k.f0);
    return Math.max(...f) / Math.min(...f);
  };
  assert.ok(peak('ru') > peak('es') && peak('es') > peak('fr'), 'ru > es > fr');
});

test('Mandarin keeps its tone contours: range 1, and a gentler drift', () => {
  const zh = languageByCode('zh');
  assert.equal(zh.range, 1);
  assert.ok(zh.drift < 1);
  const heard = textToIpa('ni3 hao3', new Map([['ni3', 'ni˨˩˦'], ['hao3', 'xaʊ˨˩˦']]), zh);
  assert.match(heard.ipa, /˨˩˦/);
});
