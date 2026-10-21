const ROUTE_NAMES = new Set(['home', 'catalog', 'knowledge', 'weak', 'leaderboard', 'point', 'practice']);

export function parseRoute(hash = '') {
 const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
 const name = ROUTE_NAMES.has(parts[0]) ? parts[0] : 'home';
 if (name === 'point' || name === 'practice') {
 return {
 name,
 params: {
 pointId: decodeURIComponent(parts[1] || ''),
 ...(name === 'practice' && parts[2] ? { question: parts[2] } : {}),
 },
 };
 }
 return { name, params: {} };
}

export function makeRoute(route = { name: 'home', params: {} }) {
 const name = ROUTE_NAMES.has(route.name) ? route.name : 'home';
 if (name === 'point' || name === 'practice') {
 const pointId = encodeURIComponent(route.params?.pointId || '');
 const question = name === 'practice' && route.params?.question ? `/${encodeURIComponent(route.params.question)}` : '';
 return `#/${name}/${pointId}${question}`;
 }
 return `#/${name}`;
}

export { ROUTE_NAMES };

