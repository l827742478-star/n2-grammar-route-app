import { GRAMMAR_POINTS } from './content/grammar.js';
import { loadState, saveState } from './state.js';
import { parseRoute } from './router.js';
import { bindInteractions } from './interactions.js?界面=中文&版本=20261021b';
import { renderApp } from './render.js?界面=中文&版本=20261021b';

const root = document.querySelector('#app');
const state = loadState(window.localStorage, GRAMMAR_POINTS);
let route = parseRoute(window.location.hash);
const ui = { questionIndex: Number(route.params?.question || 0) || 0, answer: '', selectedOrder: [], feedback: null };

function rerender() {
  renderApp(root, state, route, GRAMMAR_POINTS, ui);
}

function setRoute(next) {
  route = next;
}

window.addEventListener('hashchange', () => {
  route = parseRoute(window.location.hash);
  ui.questionIndex = Number(route.params?.question || 0) || 0;
  ui.answer = '';
  ui.selectedOrder = [];
  ui.feedback = null;
  state.lastRoute = route;
  saveState(window.localStorage, state);
  rerender();
});

bindInteractions(root, {
  catalog: GRAMMAR_POINTS,
  getState: () => state,
  setState: (next) => Object.assign(state, next),
  getRoute: () => route,
  setRoute,
  ui,
  rerender,
});

if (!window.location.hash) window.location.hash = '#/home';
rerender();

export { rerender, state };
