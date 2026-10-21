import assert from 'node:assert/strict';
import { GRAMMAR_POINTS } from '../src/content/grammar.js';
import {
 STORAGE_KEY,
 addProfile,
 createDefaultState,
 getWeakPoints,
 loadState,
 recordAnswer,
 resetProfile,
 saveState,
 switchProfile,
} from '../src/state.js';
import { makeRoute, parseRoute } from '../src/router.js';

const fakeStorage = () => {
 const data = new Map();
 return {
 getItem: (key) => data.get(key) ?? null,
 setItem: (key, value) => data.set(key, String(value)),
 removeItem: (key) => data.delete(key),
 };
};

let state = createDefaultState(GRAMMAR_POINTS);
assert.equal(state.profiles.length, 1);
assert.equal(state.progressByPoint[GRAMMAR_POINTS[0].id].completed, false);
assert.equal(state.profiles[0].points, 0);

state = recordAnswer(state, {
 pointId: GRAMMAR_POINTS[0].id,
 questionId: `${GRAMMAR_POINTS[0].id}-q1`,
 correct: true,
 answer: GRAMMAR_POINTS[0].pattern,
 at: '2026-10-21T09:00:00.000Z',
});
assert.equal(state.progressByPoint[GRAMMAR_POINTS[0].id].completed, true);
assert.ok(state.profiles[0].points >= 10);
assert.ok(state.profiles[0].stars >= 1);

state = recordAnswer(state, {
 pointId: GRAMMAR_POINTS[1].id,
 questionId: `${GRAMMAR_POINTS[1].id}-q1`,
 correct: false,
 answer: '错答',
 at: '2026-10-21T09:01:00.000Z',
});
assert.equal(state.progressByPoint[GRAMMAR_POINTS[1].id].incorrect, 1);
assert.equal(state.mistakes.length, 1);
assert.equal(getWeakPoints(state, GRAMMAR_POINTS)[0].id, GRAMMAR_POINTS[1].id);

const firstProfileId = state.activeProfileId;
const second = addProfile(state, '测试档案');
assert.equal(second.profiles.length, 2);
state = switchProfile(second, second.profiles[1].id);
assert.equal(state.activeProfileId, second.profiles[1].id);
assert.equal(state.profiles[1].points, 0);
state = switchProfile(state, firstProfileId);
assert.equal(state.profiles[0].points > 0, true);

state = resetProfile(state, firstProfileId);
assert.equal(state.profiles[0].points, 0);
assert.equal(state.profiles[0].mistakes.length, 0);
assert.equal(state.progressByPoint[GRAMMAR_POINTS[0].id].completed, false);

const storage = fakeStorage();
saveState(storage, second);
assert.ok(storage.getItem(STORAGE_KEY));
const loaded = loadState(storage, GRAMMAR_POINTS);
assert.equal(loaded.profiles.length, 2);
storage.setItem(STORAGE_KEY, '{bad json');
const repaired = loadState(storage, GRAMMAR_POINTS);
assert.equal(repaired.profiles.length, 1);
assert.equal(repaired.progressByPoint[GRAMMAR_POINTS[0].id].completed, false);

assert.deepEqual(parseRoute('#/catalog'), { name: 'catalog', params: {} });
assert.deepEqual(parseRoute('#/point/n2-001'), { name: 'point', params: { pointId: 'n2-001' } });
assert.deepEqual(parseRoute('#/practice/n2-001/2'), { name: 'practice', params: { pointId: 'n2-001', question: '2' } });
assert.equal(makeRoute({ name: 'point', params: { pointId: 'n2-001' } }), '#/point/n2-001');

console.log('state-check: PASS (fresh, answer, weak, profiles, reset, storage recovery, routes)');
