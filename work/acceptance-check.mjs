import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GRAMMAR_POINTS } from '../src/content/grammar.js';
import { createDefaultState, getWeakPoints, loadState, recordAnswer } from '../src/state.js';
import { parseRoute } from '../src/router.js';

const requiredFiles = ['index.html', 'styles.css', 'src/app.js', 'src/render.js', 'src/interactions.js', 'src/state.js', 'src/router.js'];
for (const file of requiredFiles) await readFile(new URL(`../${file}`, import.meta.url));
assert.equal(GRAMMAR_POINTS.length, 233);
assert.equal(createDefaultState(GRAMMAR_POINTS).profiles.length, 1);
const fresh = createDefaultState(GRAMMAR_POINTS);
assert.equal(getWeakPoints(fresh, GRAMMAR_POINTS).length, 0);
const answered = recordAnswer(fresh, { pointId: GRAMMAR_POINTS[0].id, questionId: `${GRAMMAR_POINTS[0].id}-q1`, correct: false, answer: 'x', at: '2026-10-21T00:00:00.000Z' });
assert.equal(getWeakPoints(answered, GRAMMAR_POINTS)[0].id, GRAMMAR_POINTS[0].id);
assert.deepEqual(parseRoute('#/practice/n2-001/2').name, 'practice');
assert.match(await readFile(new URL('../README.md', import.meta.url), 'utf8'), /233/);
console.log('acceptance-check: PASS (artifact files, count, fresh empty weak, wrong-answer weak, route contract)');
