import test from 'node:test';
import assert from 'node:assert/strict';
import { onsetLength } from '../lib/syllables.js';
import { syllabify } from '../lib/rhythm.js';
import { spanishToIpa, indonesianToIpa } from '../lib/g2p.js';

test('the onset grows while the last consonants can start a word, up to the maximum', () => {
  const pairs = new Set(['pr', 'tr']);
  const can = (cs) => cs.length === 1 || (cs.length === 2 && pairs.has(cs.join('')));
  assert.equal(onsetLength([], can, 2), 0);
  assert.equal(onsetLength(['p'], can, 2), 1);
  assert.equal(onsetLength(['n', 't', 'r'], can, 2), 2, 'tr starts a word, so n stays behind');
  assert.equal(onsetLength(['s', 't'], can, 2), 1, 'st is not a cluster here');
  assert.equal(onsetLength(['p', 'r'], can, 1), 1, 'the maximum wins');
  assert.equal(onsetLength(['x', 'y'], () => false, 3), 0, 'nothing can start: all stay behind');
});

// The two callers keep their own tests but share the rule, so their answers on the same words agree.
test('g2p and the rhythm syllabifier cut the same word at the same place', () => {
  for (const [ipa, expected] of [[spanishToIpa('cuatro'), 2], [spanishToIpa('hablar'), 2], [indonesianToIpa('sekarang'), 3]]) {
    const syllables = syllabify(ipa.replace('ˈ', ''));
    assert.equal(syllables.length, expected, ipa);
  }
});
