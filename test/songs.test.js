import test from 'node:test';
import assert from 'node:assert/strict';
import { HAPPY_BIRTHDAY, songFor } from '../lib/songs.js';
import { LANGUAGES } from '../lib/languages.js';
import { syllabify } from '../lib/rhythm.js';
import { parseNotes } from '../lib/melody.js';
import { tokenize } from '../lib/ipa.js';

test('every language has the song, in four lines', () => {
  assert.deepEqual(Object.keys(HAPPY_BIRTHDAY).sort(), LANGUAGES.map((l) => l.code).sort());
  for (const s of Object.values(HAPPY_BIRTHDAY)) assert.equal(s.lyrics.length, 4), assert.equal(s.notes.length, 4);
});

test('every line has exactly one note for each syllable, and only sounds the engine knows', () => {
  for (const [code, s] of Object.entries(HAPPY_BIRTHDAY)) {
    s.lyrics.forEach((line, i) => {
      assert.equal(syllabify(line).length, parseNotes(s.notes[i]).length, `${code} line ${i + 1}`);
      assert.deepEqual(tokenize(line).filter((t) => t.type === 'unknown'), [], `${code} line ${i + 1}: unknown symbols`);
    });
  }
});

test('songFor joins the lines, and falls back to English', () => {
  assert.equal(songFor('es').text.split(' ').length, HAPPY_BIRTHDAY.es.lyrics.join(' ').split(' ').length);
  assert.equal(songFor('xx').text, songFor('en').text);
  assert.equal(songFor('en').checked, true);
});
