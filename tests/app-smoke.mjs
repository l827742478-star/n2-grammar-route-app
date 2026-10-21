import assert from 'node:assert/strict';
import { GRAMMAR_POINTS } from '../src/content/grammar.js';
import { createDefaultState } from '../src/state.js';
import { viewModelForRoute } from '../src/render.js';

const state = createDefaultState(GRAMMAR_POINTS);
const routes = [
 { name: 'home', params: {} },
 { name: 'catalog', params: {} },
 { name: 'knowledge', params: {} },
 { name: 'weak', params: {} },
 { name: 'leaderboard', params: {} },
 { name: 'point', params: { pointId: GRAMMAR_POINTS[0].id } },
 { name: 'practice', params: { pointId: GRAMMAR_POINTS[0].id } },
];

for (const route of routes) {
 const model = viewModelForRoute(route, state, GRAMMAR_POINTS);
 assert.ok(model.title, `${route.name} needs a landmark title`);
 assert.ok(model.patterns?.includes(GRAMMAR_POINTS[0].pattern) || model.point?.pattern === GRAMMAR_POINTS[0].pattern, `${route.name} should expose a catalog-derived pattern`);
}

console.log('app-smoke: PASS (all route view models expose titles and catalog content)');
