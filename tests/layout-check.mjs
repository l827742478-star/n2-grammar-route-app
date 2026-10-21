import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
assert.match(html, /name="viewport"/);
assert.match(html, /type="module"/);
assert.doesNotMatch(html, /<img\b/i, 'app should not depend on external images');
assert.doesNotMatch(html, /https?:\/\//i, 'index should not load remote dependencies');
assert.match(css, /@media\s*\(max-width:\s*700px\)/);
assert.match(css, /overflow-x:\s*hidden/);
assert.match(css, /\.bottom-nav/);
console.log('layout-check: PASS (viewport, local-only shell, responsive breakpoints, mobile nav)');
