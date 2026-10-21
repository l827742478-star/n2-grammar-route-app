import assert from 'node:assert/strict';
import { GRAMMAR_POINTS } from '../src/content/grammar.js';
import { getQuestionSet } from '../src/content/questions.js';

const supportedTypes = new Set(['choice', 'fill', 'order']);
for (const point of GRAMMAR_POINTS) {
  const questions = getQuestionSet(point);
  assert.equal(questions.length, 5, `${point.id} should have exactly five questions`);
  const ids = new Set();
  for (const question of questions) {
    assert.ok(question.id && !ids.has(question.id), `${point.id} has duplicate question id`);
    ids.add(question.id);
    assert.equal(question.pointId, point.id);
    assert.ok(supportedTypes.has(question.type), `${question.id} has unsupported type`);
    assert.ok(question.prompt && question.answer && question.explanation, `${question.id} is incomplete`);
    if (question.type === 'choice') {
      assert.ok(Array.isArray(question.options) && question.options.length === 4, `${question.id} needs four options`);
      assert.equal(new Set(question.options).size, question.options.length, `${question.id} options should be unique`);
      assert.ok(question.options.includes(question.answer), `${question.id} answer should be an option`);
    }
    if (question.type === 'order') {
      assert.ok(Array.isArray(question.tokens) && question.tokens.length >= 2, `${question.id} needs order tokens`);
    }
  }
}

console.log(`question-check: PASS (${GRAMMAR_POINTS.length} points x ${getQuestionSet(GRAMMAR_POINTS[0]).length}+ questions)`);
