// # Writing docs/composition.md
//
// The composition table lives in `lib/composition.js` so a test can check it against the code. This script
// writes it out as a document. Run `node scripts/composition-doc.mjs` after changing the table; the test fails
// if the document is out of date.
import { writeFileSync } from 'node:fs';
import { compositionMarkdown } from '../lib/composition.js';
import { LANGUAGES } from '../lib/languages.js';

writeFileSync(new URL('../docs/composition.md', import.meta.url), compositionMarkdown(LANGUAGES));
console.log('wrote docs/composition.md');
