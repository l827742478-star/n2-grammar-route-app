function nearbyPatterns(point, catalog) {
 const rows = Array.isArray(catalog) && catalog.length ? catalog : [];
 const values = rows
 .map((row) => Array.isArray(row) ? row[1] : row.pattern)
 .filter((pattern) => pattern && pattern !== point.pattern);
 const start = Math.max(0, (point.order ?? 1) % Math.max(values.length, 1));
 return [...values.slice(start, start + 4), ...values.slice(0, 4)].filter((value, index, all) => all.indexOf(value) === index).slice(0, 3);
}

function makeOrderTokens(sentence) {
 const clean = sentence.replace(/[。！？]$/, '');
 const cut = clean.split('、');
 if (cut.length >= 2) return [cut[0], '、', cut.slice(1).join('、'), '。'];
 return [clean.slice(0, Math.ceil(clean.length / 2)), clean.slice(Math.ceil(clean.length / 2)), '。'];
}

export function buildQuestions(point, catalog = []) {
 const distractors = nearbyPatterns(point, catalog);
 const options = [point.pattern, ...distractors].slice(0, 4);
 const first = point.examples[0].ja;
 const basePattern = point.pattern.split('（')[0];
 const blanked = first.replace(point.pattern, '＿＿＿＿').replace(basePattern, '＿＿＿＿').replace(first, first.replace('、', '＿＿＿＿、'));
 return [
 {
 id: `${point.id}-q1`,
 pointId: point.id,
 type: 'choice',
 prompt: `选出最适合填入空格的表达：\n${blanked}`,
 options,
 answer: point.pattern,
 explanation: `答案是「${point.pattern}」。${point.connection}；${point.meaning}。`,
 },
 {
 id: `${point.id}-q2`,
 pointId: point.id,
 type: 'fill',
 prompt: `请写出表示“${point.meaning}”的语法：`,
 answer: point.pattern,
 acceptableAnswers: [point.pattern, point.pattern.replace(/[（）]/g, '')],
 explanation: `句型「${point.pattern}」的接续是${point.connection}。`,
 },
 {
 id: `${point.id}-q3`,
 pointId: point.id,
 type: 'choice',
 prompt: `「${point.pattern}」最需要注意的接续是：`,
 options: [point.connection, '只接名词，不受动词变化影响', '只能用于过去时', '只能用于疑问句'],
 answer: point.connection,
 explanation: `记忆重点：${point.connection}。${point.pitfalls}`,
 },
 {
 id: `${point.id}-q4`,
 pointId: point.id,
 type: 'fill',
 prompt: `根据例句补全语法：\n${blanked}\n\n中文提示：${point.examples[0].zh}`,
 answer: point.pattern,
 acceptableAnswers: [point.pattern, point.pattern.replace(/[（）]/g, '')],
 explanation: point.explanation,
 },
 {
 id: `${point.id}-q5`,
 pointId: point.id,
 type: 'order',
 prompt: `把句子片段排成正确顺序：`,
 tokens: makeOrderTokens(first),
 answer: first,
 explanation: `完整句：${first}\n${point.examples[0].zh}`,
 },
 ];
}

export function getQuestionSet(point, catalog = []) {
 return point.questions?.length ? point.questions : buildQuestions(point, catalog);
}

export function normalizeAnswer(value) {
 return String(value ?? '').trim().replace(/[。．，、\s]/g, '').toLowerCase();
}

export function isAnswerCorrect(question, value) {
 const received = normalizeAnswer(value);
 const accepted = [question.answer, ...(question.acceptableAnswers ?? [])].map(normalizeAnswer);
 return accepted.includes(received);
}
