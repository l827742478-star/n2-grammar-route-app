import assert from 'node:assert/strict';
import { GRAMMAR_POINTS } from '../src/content/grammar.js';
import { getQuestionSet, normalizeAnswer } from '../src/content/questions.js';

const requiredFocuses = new Set(['语境选用', '近义辨析', '语义判断', '用法诊断', '句子重组']);
const promptKeys = new Set();
const answerPositions = [0, 0, 0, 0];

for (const point of GRAMMAR_POINTS) {
  const questions = getQuestionSet(point);
  assert.equal(questions.length, 5, `${point.id} must have exactly five deliberate questions`);
  assert.deepEqual(new Set(questions.map((question) => question.focus)), requiredFocuses, `${point.id} must test five different abilities`);

  for (const question of questions) {
    const promptKey = normalizeAnswer(question.prompt);
    assert.ok(question.prompt.length >= 24, `${question.id} prompt is too thin to establish context`);
    assert.match(question.prompt, /[\u3040-\u30ff\u3400-\u9fff]/, `${question.id} needs Japanese context`);
    assert.ok(!promptKeys.has(promptKey), `${question.id} repeats another prompt`);
    promptKeys.add(promptKey);
    assert.ok(question.explanation.length >= 34, `${question.id} explanation must teach the distinction`);

    if (question.type === 'choice') {
      assert.equal(question.options.length, 4, `${question.id} must have four options`);
      assert.equal(question.options.filter((option) => option === question.answer).length, 1, `${question.id} must contain one exact answer`);
      answerPositions[question.options.indexOf(question.answer)] += 1;
      assert.equal(question.distractorPointIds?.length, 3, `${question.id} must use three tracked contrast points`);
      assert.equal(new Set(question.distractorPointIds).size, 3, `${question.id} contrast points must be unique`);
      assert.ok(question.distractorPointIds.every((id) => id !== point.id), `${question.id} cannot contrast with itself`);
    }

    if (question.focus === '语境选用' || question.focus === '近义辨析') {
      assert.match(question.prompt, /＿＿/, `${question.id} must ask inside a real cloze context`);
      assert.doesNotMatch(question.prompt, /（＿＿）/, `${question.id} uses a fallback blank instead of removing the tested grammar`);
    }

    if (question.type === 'order') {
      assert.ok(question.tokens.length >= 4 && question.tokens.length <= 6, `${question.id} needs a meaningful four-to-six-part composition`);
      assert.notEqual(question.tokens.join(''), question.answer, `${question.id} tokens must be shuffled`);
      assert.equal(new Set(question.tokens).size, question.tokens.length, `${question.id} order tokens must be individually selectable`);
    }
  }
}

assert.ok(Math.min(...answerPositions) >= 150, `correct options are position-biased: ${answerPositions.join('/')}`);
assert.ok(Math.max(...answerPositions) - Math.min(...answerPositions) <= 5, `correct options are not evenly distributed: ${answerPositions.join('/')}`);

console.log(`question-quality-check: PASS (${GRAMMAR_POINTS.length * 5} questions; answer positions ${answerPositions.join('/')})`);
