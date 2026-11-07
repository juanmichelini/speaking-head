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
  const byHand = speak(heard.ipa, woman, {}, { rate: 1, overrides: rhythmPlan(heard.ipa, 'syllable').overrides });
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
  assert.deepEqual(flat.score, plan(base.ipa, { f0: woman.f0, tenseness: woman.tenseness, range: woman.range, jitter: woman.jitter, vibratoDepth: woman.vibratoDepth, declination: 0.08 }).score);
});

test('the rhythm choice: a named one, none, or the accent\'s then the language\'s', () => {
  assert.equal(chooseRhythm('none', null, es), null);
  assert.equal(chooseRhythm('stress', null, es), 'stress');
  assert.equal(chooseRhythm('language', null, es), 'syllable');
  assert.equal(chooseRhythm('language', { rhythm: 'stress' }, es), 'stress', 'the accent wins');
  assert.equal(chooseRhythm('language', {}, es), 'syllable');
});
