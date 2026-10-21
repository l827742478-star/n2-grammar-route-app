import { getQuestionSet, isAnswerCorrect } from './content/questions.js';
import { findPointById } from './content/content-utils.js';
import { addProfile, recordAnswer, resetProfile, saveState, switchProfile } from './state.js';
import { makeRoute } from './router.js';
import { escapeHTML } from './render.js?界面=中文';

export function bindInteractions(root, context) {
 const { catalog, getState, setState, getRoute, setRoute, ui, rerender } = context;
 root.addEventListener('click', (event) => {
 const profile = event.target.closest('[data-profile-id]');
 if (profile) {
 const state = switchProfile(getState(), profile.dataset.profileId);
 setState(state); saveState(localStorage, state); rerender(); return;
 }
 const orderToken = event.target.closest('[data-order-token]');
 if (orderToken) {
 ui.selectedOrder = [...(ui.selectedOrder || []), orderToken.dataset.orderToken];
 rerender(); return;
 }
 const picked = event.target.closest('[data-order-picked]');
 if (picked) {
 ui.selectedOrder = (ui.selectedOrder || []).filter((token) => token !== picked.dataset.orderPicked);
 rerender(); return;
 }
 const action = event.target.closest('[data-action]')?.dataset.action;
 if (action === 'next-question') {
 const pointId = getRoute().params?.pointId;
 const point = findPointById(pointId, catalog);
 const total = point ? getQuestionSet(point).length : 5;
 if ((ui.questionIndex || 0) + 1 >= total) {
 ui.questionIndex = 0;
 ui.feedback = null;
 window.location.hash = makeRoute({ name: 'point', params: { pointId } });
 } else {
 ui.questionIndex = (ui.questionIndex || 0) + 1;
 ui.answer = '';
 ui.selectedOrder = [];
 ui.feedback = null;
 rerender();
 }
 return;
 }
 if (action === 'reset-profile') {
 const state = resetProfile(getState());
 setState(state); saveState(localStorage, state); rerender(); return;
 }
 if (action === 'open-profile') {
 const popover = root.querySelector('[data-profile-popover]');
 if (popover) {
 popover.hidden = !popover.hidden;
 popover.innerHTML = `<div class="popover-inner"><span class="eyebrow">切换档案</span>${getState().profiles.map((item) => `<button data-profile-id="${escapeHTML(item.id)}" type="button">${escapeHTML(item.name)}</button>`).join('')}<a href="#/leaderboard">管理档案 →</a></div>`;
 }
 }
 });

 root.addEventListener('input', (event) => {
 if (event.target.matches('[data-search-input]')) {
 const query = event.target.value.trim().toLowerCase();
 root.querySelectorAll('[data-point-card]').forEach((card) => {
 card.hidden = query && !card.dataset.search.toLowerCase().includes(query);
 });
 }
 });

 root.addEventListener('submit', (event) => {
 const profileForm = event.target.closest('[data-profile-form]');
 if (profileForm) {
 event.preventDefault();
 const name = new FormData(profileForm).get('name');
 const state = addProfile(getState(), name);
 setState(state); saveState(localStorage, state); rerender(); return;
 }
 const answerForm = event.target.closest('[data-answer-form]');
 if (answerForm) {
 event.preventDefault();
 const point = findPointById(answerForm.dataset.pointId, catalog);
 if (!point) return;
 const question = getQuestionSet(point)[Number(answerForm.dataset.questionIndex) || 0];
 const orderValue = ui.selectedOrder?.join('') || '';
 const answer = question.type === 'choice' ? new FormData(answerForm).get('answer') || '' : question.type === 'fill' ? new FormData(answerForm).get('answer') || '' : orderValue;
 const correct = isAnswerCorrect(question, answer);
 const state = recordAnswer(getState(), { pointId: point.id, questionId: question.id, correct, answer, at: new Date().toISOString() });
 setState(state); saveState(localStorage, state);
 ui.answer = answer;
 ui.feedback = { correct, answer: question.answer, explanation: question.explanation };
 rerender();
 }
 });
}
