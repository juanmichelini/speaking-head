import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { LANGUAGES } from '../lib/languages.js';
import { LAYERS, LESSONS, FSHARP_ONLY, levelOf, compositionMarkdown } from '../lib/composition.js';
import { demos } from '../lib/demos.js';

const lib = readdirSync(new URL('../lib/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

test('every module in lib/ is placed on a layer, and only listed modules exist', () => {
  assert.deepEqual(lib.filter((m) => Number.isNaN(levelOf(m))), [], 'unplaced modules');
  const listed = Object.values(LAYERS).flat();
  assert.deepEqual(listed.filter((m) => !lib.includes(m)), [], 'listed modules that do not exist');
});

test('no module imports from its own layer or above (the code is bottom-up)', () => {
  const problems = [];
  for (const m of lib) {
    const src = readFileSync(new URL(`../lib/${m}.js`, import.meta.url), 'utf8');
    for (const [, dep] of src.matchAll(/from '\.\/([a-z0-9-]+)\.js'/g)) {
      if (levelOf(dep) >= levelOf(m)) problems.push(`${m} (level ${levelOf(m)}) imports ${dep} (level ${levelOf(dep)})`);
    }
  }
  assert.deepEqual(problems, []);
});

test('every lesson is described once, in ladder order, and builds only on lessons below it', () => {
  assert.deepEqual(LESSONS.map((l) => l.slug), demos.map((d) => d.slug), 'same lessons, same order as lib/demos.js');
  assert.deepEqual(LESSONS.map((l) => l.n), demos.map((d) => String(d.n)));
  const position = new Map([...LESSONS, FSHARP_ONLY].map((l, i) => [l.n, i]));
  for (const l of [...LESSONS, FSHARP_ONLY]) {
    for (const dep of l.from) {
      assert.ok(position.has(dep), `${l.n} builds on unknown lesson ${dep}`);
      assert.ok(position.get(dep) < position.get(l.n), `${l.n} builds on ${dep}, which comes later`);
    }
    for (const f of ['input', 'range', 'output']) assert.ok(l[f] && l[f].length > 5, `${l.n} needs a ${f}`);
  }
});

test('every file a lesson names exists', () => {
  for (const l of [...LESSONS, FSHARP_ONLY]) for (const f of l.files) assert.ok(exists(f), `${l.n}: ${f}`);
});

test('docs/composition.md is the generated table', () => {
  assert.equal(readFileSync(new URL('../docs/composition.md', import.meta.url), 'utf8'), compositionMarkdown(LANGUAGES), 'run node scripts/composition-doc.mjs');
});
