import assert from 'node:assert/strict';
import { GRAMMAR_POINTS } from '../src/content/grammar.js';
import {
 findPointById,
 getModuleStats,
 getSearchText,
 normalizePattern,
} from '../src/content/content-utils.js';

assert.ok(Array.isArray(GRAMMAR_POINTS), 'catalog should be an array');
assert.ok(GRAMMAR_POINTS.length > 150, `catalog should contain >150 levels, got ${GRAMMAR_POINTS.length}`);

const ids = new Set();
const patterns = new Set();
for (const [index, point] of GRAMMAR_POINTS.entries()) {
 assert.equal(point.order, index + 1, `order should be continuous at ${point.id}`);
 assert.ok(point.id && !ids.has(point.id), `duplicate id: ${point.id}`);
 ids.add(point.id);
 const normalized = normalizePattern(point.pattern);
 assert.ok(normalized && !patterns.has(normalized), `duplicate pattern: ${point.pattern}`);
 patterns.add(normalized);
 for (const key of ['module', 'pattern', 'kana', 'meaning', 'usage', 'connection', 'explanation', 'pitfalls', 'related', 'register']) {
 assert.ok(String(point[key] ?? '').trim(), `${point.id} missing ${key}`);
 }
 assert.ok(Array.isArray(point.examples) && point.examples.length >= 2, `${point.id} needs two examples`);
 for (const example of point.examples) {
 assert.ok(example.ja && example.zh, `${point.id} example needs ja and zh`);
 }
 assert.ok(Array.isArray(point.questions) && point.questions.length >= 5, `${point.id} needs five questions`);
 assert.ok(Array.isArray(point.keywords) && point.keywords.length >= 2, `${point.id} needs keywords`);
}

const first = GRAMMAR_POINTS[0];
assert.equal(findPointById(first.id), first);
const searchText = getSearchText(first);
for (const value of [first.pattern, first.meaning, first.connection, first.examples[0].ja, ...first.keywords]) {
 assert.ok(searchText.includes(value), `search text should contain ${value}`);
}

const stats = getModuleStats(GRAMMAR_POINTS);
assert.equal(Object.values(stats).reduce((sum, item) => sum + item.count, 0), GRAMMAR_POINTS.length);
assert.ok(Object.keys(stats).length >= 8, 'catalog should have multiple learning modules');

console.log(`content-check: PASS (${GRAMMAR_POINTS.length} grammar points / levels)`);
