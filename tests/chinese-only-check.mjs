import assert from 'node:assert/strict';
import { GRAMMAR_POINTS } from '../src/content/grammar.js';
import { createDefaultState } from '../src/state.js';
import { makeRoute } from '../src/router.js';
import { renderApp } from '../src/render.js';

const forbidden = /\b(?:ROUTE|RESEARCH|TODAY|DAILY|NEXT|SIGNAL|THE|MAP|LEVELS|FIELD|NOTE|QUESTION|CONNECTION|EXPLANATION|EVIDENCE|PITFALL|RELATED|READY|TEST|REVIEW|DESK|FLAGS|LOCAL|BOARD|OFFLINE|ONLY|PROFILE|LAB|SWITCH|PROFILE|pts|levels|stars)\b/;
const state = createDefaultState(GRAMMAR_POINTS);
for (const route of [
 { name: 'home', params: {} },
 { name: 'catalog', params: {} },
 { name: 'knowledge', params: {} },
 { name: 'weak', params: {} },
 { name: 'leaderboard', params: {} },
 { name: 'point', params: { pointId: GRAMMAR_POINTS[0].id } },
 { name: 'practice', params: { pointId: GRAMMAR_POINTS[0].id } },
]) {
 const root = { innerHTML: '' };
 renderApp(root, state, route, GRAMMAR_POINTS);
 const visibleText = root.innerHTML.replace(/<[^>]*>/g, ' ');
 assert.doesNotMatch(visibleText, forbidden, `${makeRoute(route)} contains visible English`);
}

console.log('chinese-only-check: PASS (all route visible strings are Chinese/Japanese)');
