const PATTERN_ALIASES = {
  'に反して': ['に反した', 'に反する'],
  'をおいてほかにない': ['をおいてほかに'],
  'ようになる': ['ようになった', 'ようになって', 'ようになり'],
  'ないではいられない': ['ないではいられなかった', 'ないではいられな'],
  'ずにはいられない': ['ずにはいられなかった', 'ずにはいられな'],
  'を余儀なくされる': ['を余儀なくされた', 'を余儀なくされ'],
  'にあたらない': ['にはあたらない', 'にはあたらな'],
  'てしょうがない': ['でしょうがない', 'くてしょうがない'],
  'ようものなら': ['ものなら'],
  'を余儀なくさせる': ['を余儀なくさせた', 'を余儀なくさせ'],
};

function catalogPoint(row, index) {
  if (!Array.isArray(row)) return row;
  return {
    id: `n2-${String(index + 1).padStart(3, '0')}`,
    order: index + 1,
    module: row[0],
    pattern: row[1],
    meaning: row[2],
    connection: row[3],
    examples: [
      { zh: row[4], ja: row[5] },
      { zh: row[6], ja: row[7] },
    ],
  };
}

function pointRows(catalog) {
  return (Array.isArray(catalog) ? catalog : []).map(catalogPoint);
}

function charPairs(value) {
  const clean = String(value).replace(/[；，。、“”……（）　\s]/g, '');
  return new Set(Array.from({ length: Math.max(0, clean.length - 1) }, (_, index) => clean.slice(index, index + 2)));
}

function semanticOverlap(a, b) {
  const left = charPairs(a);
  const right = charPairs(b);
  let matches = 0;
  for (const pair of left) if (right.has(pair)) matches += 1;
  return matches;
}

function connectionOverlap(a, b) {
  const left = new Set(String(a).split(/[・＋]/));
  return String(b).split(/[・＋]/).filter((part) => left.has(part)).length;
}

function chooseComparators(point, catalog, valueSelector = (candidate) => candidate.pattern) {
  const rows = pointRows(catalog).filter((candidate) => candidate.id !== point.id);
  const sameModule = rows.filter((candidate) => candidate.module === point.module);
  const pool = sameModule.length >= 6 ? sameModule : rows;
  const ranked = [...pool].sort((a, b) => {
    const score = (candidate) => (
      semanticOverlap(point.meaning, candidate.meaning) * 12
      + connectionOverlap(point.connection, candidate.connection) * 4
      + Math.max(0, 10 - Math.abs(point.order - candidate.order))
    );
    return score(b) - score(a) || Math.abs(point.order - a.order) - Math.abs(point.order - b.order) || a.order - b.order;
  });

  const picked = [];
  const values = new Set([valueSelector(point)]);
  for (const candidate of [...ranked, ...rows]) {
    const value = valueSelector(candidate);
    if (!value || values.has(value)) continue;
    values.add(value);
    picked.push(candidate);
    if (picked.length === 3) break;
  }
  return picked;
}

function optionalPatternVariants(pattern) {
  const source = String(pattern);
  const full = source.replace(/（([^）]+)）/g, '$1');
  const base = source.replace(/（[^）]+）/g, '');
  return [...new Set([full, base])];
}

function makeCloze(sentence, pattern) {
  let result = String(sentence);
  const variants = optionalPatternVariants(pattern);
  const direct = variants.filter((value) => !value.includes('〜')).sort((a, b) => b.length - a.length);
  for (const candidate of direct) {
    if (candidate && result.includes(candidate)) return result.replace(candidate, '＿＿');
  }

  const anchors = [...new Set(variants.flatMap((value) => value.split('〜')))]
    .filter((value) => value.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const anchor of anchors) {
    if (result.includes(anchor)) return result.replaceAll(anchor, '＿＿');
  }

  const aliases = PATTERN_ALIASES[pattern] ?? [];
  for (const alias of aliases.sort((a, b) => b.length - a.length)) {
    if (result.includes(alias)) return result.replace(alias, '＿＿');
  }

  const softened = variants
    .map((value) => value.replace(/だ$/, '').replace(/する$/, ''))
    .filter((value) => value.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const candidate of softened) {
    if (result.includes(candidate)) return result.replace(candidate, '＿＿');
  }

  const comma = result.search(/[、，]/);
  if (comma > 3) return `${result.slice(0, comma)}（＿＿）${result.slice(comma)}`;
  return `（＿＿）${result}`;
}

function rotateAnswer(options, answer, position) {
  const unique = [...new Set(options)];
  const withoutAnswer = unique.filter((option) => option !== answer);
  const arranged = withoutAnswer.slice(0, 3);
  arranged.splice(position % 4, 0, answer);
  return arranged;
}

function choiceQuestion({ point, number, focus, prompt, options, answer, comparators, explanation }) {
  return {
    id: `${point.id}-q${number}`,
    pointId: point.id,
    type: 'choice',
    focus,
    prompt,
    options: rotateAnswer(options, answer, (point.order + number - 2) % 4),
    answer,
    distractorPointIds: comparators.map((candidate) => candidate.id),
    explanation,
  };
}

function splitSentence(sentence) {
  const value = String(sentence);
  let words;
  try {
    words = [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(value)].map((part) => part.segment);
  } catch {
    words = [...value];
  }

  const wanted = Math.min(5, Math.max(4, Math.floor(words.length / 3)));
  const chunks = [];
  for (let group = 0; group < wanted; group += 1) {
    const start = Math.floor((group * words.length) / wanted);
    const end = Math.floor(((group + 1) * words.length) / wanted);
    chunks.push(words.slice(start, end).join(''));
  }

  for (let index = chunks.length - 1; index > 0; index -= 1) {
    if (!chunks[index] || chunks.indexOf(chunks[index]) !== index) {
      chunks[index - 1] += chunks[index];
      chunks.splice(index, 1);
    }
  }
  while (chunks.length < 4) {
    const longestIndex = chunks.reduce((best, chunk, index) => chunk.length > chunks[best].length ? index : best, 0);
    const chunk = chunks[longestIndex];
    const cut = Math.max(1, Math.floor(chunk.length / 2));
    chunks.splice(longestIndex, 1, chunk.slice(0, cut), chunk.slice(cut));
  }
  return chunks;
}

function shuffledTokens(sentence, order) {
  const chunks = splitSentence(sentence);
  const permutations = [
    [2, 0, 3, 1, 4],
    [1, 3, 0, 4, 2],
    [3, 1, 4, 0, 2],
    [4, 2, 0, 3, 1],
  ];
  const permutation = permutations[order % permutations.length];
  return permutation.filter((index) => index < chunks.length).map((index) => chunks[index]);
}

function contrastSummary(point, comparator) {
  return comparator
    ? `与「${comparator.pattern}」（${comparator.meaning}）相比，本题更关键的是${point.meaning}。`
    : `判断时要把语义、接续和前后关系一起看。`;
}

export function buildQuestions(point, catalog = []) {
  const patternComparators = chooseComparators(point, catalog);
  const meaningComparators = chooseComparators(point, catalog, (candidate) => candidate.meaning);
  const sentenceComparators = chooseComparators(point, catalog, (candidate) => candidate.examples?.[0]?.ja);
  const patterns = [point.pattern, ...patternComparators.map((candidate) => candidate.pattern)];
  const meanings = [point.meaning, ...meaningComparators.map((candidate) => candidate.meaning)];
  const sentences = [point.examples[1].ja, ...sentenceComparators.map((candidate) => candidate.examples[0].ja)];
  const first = point.examples[0];
  const second = point.examples[1];
  const contrast = contrastSummary(point, patternComparators[0]);

  return [
    choiceQuestion({
      point,
      number: 1,
      focus: '语境选用',
      prompt: `先判断前后项的逻辑，再选择最自然的表达。不要先看中文逐词套用。\n${makeCloze(first.ja, point.pattern)}`,
      options: patterns,
      answer: point.pattern,
      comparators: patternComparators,
      explanation: `此处用「${point.pattern}」，表达“${point.meaning}”。它接在${point.connection}之后；句子的前后关系与该用法一致。${contrast}`,
    }),
    choiceQuestion({
      point,
      number: 2,
      focus: '近义辨析',
      prompt: `四个表达含义接近，请同时核对接续、语气与结论。\n${makeCloze(second.ja, point.pattern)}\n说话人要表达：${second.zh}`,
      options: patterns,
      answer: point.pattern,
      comparators: patternComparators,
      explanation: `答案仍是「${point.pattern}」，但不能只凭中文关键词作答。这里的接续是${point.connection}，语用重点是“${point.meaning}”。${contrast}`,
    }),
    choiceQuestion({
      point,
      number: 3,
      focus: '语义判断',
      prompt: `读完整句子，判断说话人真正强调的关系。\n「${first.ja}」\n这句话最准确的理解是哪一项？`,
      options: meanings,
      answer: point.meaning,
      comparators: meaningComparators,
      explanation: `句中「${point.pattern}」不是孤立翻译，而是在这里表达“${point.meaning}”。前项“${first.zh}”提供了判断线索，其他选项会改变句子的逻辑或语气。`,
    }),
    choiceQuestion({
      point,
      number: 4,
      focus: '用法诊断',
      prompt: `以下句子本身都可能成立；请选择真正表达“${point.meaning}”，且接续与语气都合适的一句。\n情境目标：${second.zh}\n判断时不要靠寻找目标句型的字面形式。`,
      options: sentences,
      answer: second.ja,
      comparators: sentenceComparators,
      explanation: `正确句是「${second.ja}」它把“${second.zh}”放进了自然语境，也符合${point.connection}的接续。其余句子使用的是相近但功能不同的表达。`,
    }),
    {
      id: `${point.id}-q5`,
      pointId: point.id,
      type: 'order',
      focus: '句子重组',
      prompt: `根据“${second.zh}”重组句子。\n既要让句法成立，也要保留「${point.pattern}」所表达的“${point.meaning}”。`,
      tokens: shuffledTokens(second.ja, point.order),
      answer: second.ja,
      explanation: `正确顺序是「${second.ja}」先按日语修饰关系确定句子骨架，再检查「${point.pattern}」前接${point.connection}，不能只按中文词序排列。`,
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
