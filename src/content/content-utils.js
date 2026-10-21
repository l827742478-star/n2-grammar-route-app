import { GRAMMAR_POINTS } from './grammar.js';

export function normalizePattern(value) {
 return String(value ?? '')
 .normalize('NFKC')
 .replace(/[（）()「」『』【】\s]/g, '')
 .replace(/[〜～]/g, '~')
 .toLowerCase();
}

export function findPointById(id, points = GRAMMAR_POINTS) {
 return points.find((point) => point.id === id) ?? null;
}

export function getSearchText(point) {
 return [
 point.pattern,
 point.kana,
 point.meaning,
 point.usage,
 point.connection,
 point.explanation,
 point.pitfalls,
 point.related,
 point.register,
 ...(point.keywords ?? []),
 ...(point.examples ?? []).flatMap((example) => [example.ja, example.zh]),
 ].join(' ');
}

export function getModuleStats(points = GRAMMAR_POINTS) {
 return points.reduce((stats, point) => {
 if (!stats[point.module]) stats[point.module] = { module: point.module, count: 0, mastered: 0 };
 stats[point.module].count += 1;
 return stats;
 }, {});
}

