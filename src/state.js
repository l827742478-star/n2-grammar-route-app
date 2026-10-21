export const STORAGE_KEY = 'n2-grammar-route-state-v1';
export const STATE_VERSION = 1;

function todayKey(date = new Date()) {
 const y = date.getFullYear();
 const m = String(date.getMonth() + 1).padStart(2, '0');
 const d = String(date.getDate()).padStart(2, '0');
 return `${y}-${m}-${d}`;
}

function emptyProgress(catalog) {
 return Object.fromEntries(catalog.map((point) => [point.id, {
 pointId: point.id,
 correct: 0,
 incorrect: 0,
 answered: 0,
 completed: false,
 mastery: 0,
 lastAnsweredAt: null,
 nextReviewAt: null,
 }]));
}

function emptyProfile(id, name, catalog) {
 return {
 id,
 name,
 points: 0,
 stars: 0,
 streak: 0,
 lastStudyDate: null,
 progressByPoint: emptyProgress(catalog),
 answersByQuestion: {},
 mistakes: [],
 };
}

function profileData(profile, catalog) {
 const safe = profile && typeof profile === 'object' ? profile : {};
 const progress = safe.progressByPoint && typeof safe.progressByPoint === 'object' ? safe.progressByPoint : {};
 const fresh = emptyProgress(catalog);
 for (const point of catalog) {
 const old = progress[point.id];
 if (old && typeof old === 'object') fresh[point.id] = {
 ...fresh[point.id],
 ...old,
 pointId: point.id,
 correct: Number(old.correct) || 0,
 incorrect: Number(old.incorrect) || 0,
 answered: Number(old.answered) || 0,
 mastery: Math.max(0, Math.min(100, Number(old.mastery) || 0)),
 completed: Boolean(old.completed),
 };
 }
 const answers = safe.answersByQuestion && typeof safe.answersByQuestion === 'object' ? safe.answersByQuestion : {};
 const mistakes = Array.isArray(safe.mistakes) ? safe.mistakes.filter((item) => item && item.pointId) : [];
 return {
 id: typeof safe.id === 'string' && safe.id ? safe.id : `profile-${Math.random().toString(36).slice(2, 8)}`,
 name: typeof safe.name === 'string' && safe.name.trim() ? safe.name.trim().slice(0, 24) : '我的档案',
 points: Math.max(0, Number(safe.points) || 0),
 stars: Math.max(0, Number(safe.stars) || 0),
 streak: Math.max(0, Number(safe.streak) || 0),
 lastStudyDate: typeof safe.lastStudyDate === 'string' ? safe.lastStudyDate : null,
 progressByPoint: fresh,
 answersByQuestion: { ...answers },
 mistakes: mistakes.slice(-200),
 };
}

function activeAliases(state) {
 const active = state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0];
 state.activeProfileId = active.id;
 state.answersByQuestion = active.answersByQuestion;
 state.progressByPoint = active.progressByPoint;
 state.mistakes = active.mistakes;
 return state;
}

function challengeFor(state, catalog) {
 const active = state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0];
 const weak = catalog.filter((point) => {
 const progress = active.progressByPoint[point.id];
 return progress && (progress.incorrect > 0 || !progress.completed);
 });
 const ordered = [...weak, ...catalog.filter((point) => !weak.includes(point))];
 const offset = Number(todayKey().replaceAll('-', '')) % Math.max(ordered.length, 1);
 const rotated = [...ordered.slice(offset), ...ordered.slice(0, offset)];
 return {
 date: todayKey(),
 pointIds: rotated.slice(0, Math.min(10, catalog.length)).map((point) => point.id),
 questionIds: rotated.slice(0, Math.min(10, catalog.length)).map((point) => `${point.id}-q1`),
 completed: [],
 };
}

export function createDefaultState(catalog = []) {
 const profile = emptyProfile('profile-local', '我的档案', catalog);
 const state = {
 version: STATE_VERSION,
 activeProfileId: profile.id,
 profiles: [profile],
 answersByQuestion: profile.answersByQuestion,
 progressByPoint: profile.progressByPoint,
 mistakes: profile.mistakes,
 dailyChallenge: { date: todayKey(), pointIds: [], questionIds: [], completed: [] },
 lastRoute: { name: 'home', params: {} },
 };
 state.dailyChallenge = challengeFor(state, catalog);
 return state;
}

export function loadState(storage, catalog = []) {
 let parsed = null;
 try {
 parsed = JSON.parse(storage?.getItem?.(STORAGE_KEY) || 'null');
 } catch {
 parsed = null;
 }
 if (!parsed || parsed.version !== STATE_VERSION || !Array.isArray(parsed.profiles) || !parsed.profiles.length) {
 return createDefaultState(catalog);
 }
 const profiles = parsed.profiles.map((profile) => profileData(profile, catalog));
 const state = {
 version: STATE_VERSION,
 activeProfileId: profiles.some((profile) => profile.id === parsed.activeProfileId) ? parsed.activeProfileId : profiles[0].id,
 profiles,
 answersByQuestion: {},
 progressByPoint: {},
 mistakes: [],
 dailyChallenge: parsed.dailyChallenge && typeof parsed.dailyChallenge === 'object' ? parsed.dailyChallenge : null,
 lastRoute: parsed.lastRoute && typeof parsed.lastRoute === 'object' ? parsed.lastRoute : { name: 'home', params: {} },
 };
 activeAliases(state);
 if (!state.dailyChallenge || state.dailyChallenge.date !== todayKey() || !Array.isArray(state.dailyChallenge.completed)) state.dailyChallenge = challengeFor(state, catalog);
 return state;
}

export function saveState(storage, state) {
 if (!storage?.setItem) return;
 storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function recordAnswer(state, event) {
 const active = state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0];
 const pointId = String(event.pointId || '');
 const now = event.at || new Date().toISOString();
 const progress = active.progressByPoint[pointId];
 if (!progress) return state;
 const wasCompleted = progress.completed;
 progress.answered += 1;
 if (event.correct) {
 progress.correct += 1;
 progress.mastery = Math.min(100, Math.max(progress.mastery, 55) + 15);
 progress.completed = true;
 active.points += wasCompleted ? 3 : 10;
 active.stars += wasCompleted ? 0 : 1;
 active.lastStudyDate = todayKey(new Date(now));
 if (state.dailyChallenge?.questionIds?.includes(event.questionId) && !state.dailyChallenge.completed.includes(event.questionId)) {
 state.dailyChallenge.completed.push(event.questionId);
 }
 } else {
 progress.incorrect += 1;
 progress.mastery = Math.max(0, progress.mastery - 20);
 active.mistakes.push({
 id: `${event.questionId || pointId}-${now}`,
 pointId,
 questionId: event.questionId || null,
 answer: String(event.answer ?? '').slice(0, 100),
 at: now,
 resolved: false,
 });
 active.mistakes = active.mistakes.slice(-200);
 }
 if (event.questionId) active.answersByQuestion[event.questionId] = {
 correct: Boolean(event.correct),
 answer: String(event.answer ?? '').slice(0, 100),
 at: now,
 };
 progress.lastAnsweredAt = now;
 progress.nextReviewAt = new Date(new Date(now).getTime() + (event.correct ? 3 : 1) * 86400000).toISOString();
 return activeAliases(state);
}

export function addProfile(state, name = '新档案') {
 const safeName = String(name || '新档案').trim().slice(0, 24) || '新档案';
 const catalog = Object.values(state.progressByPoint).map((item) => ({ id: item.pointId }));
 const id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
 state.profiles.push(emptyProfile(id, safeName, catalog));
 return state;
}

export function switchProfile(state, profileId) {
 if (state.profiles.some((profile) => profile.id === profileId)) state.activeProfileId = profileId;
 return activeAliases(state);
}

export function resetProfile(state, profileId = state.activeProfileId) {
 const target = state.profiles.find((profile) => profile.id === profileId);
 if (!target) return state;
 const catalog = Object.values(target.progressByPoint).map((item) => ({ id: item.pointId }));
 const fresh = emptyProfile(target.id, target.name, catalog);
 Object.assign(target, fresh);
 return activeAliases(state);
}

export function getWeakPoints(state, catalog = []) {
 const active = state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0];
 return catalog
 .filter((point) => {
 const progress = active.progressByPoint[point.id];
 return progress && (progress.incorrect > 0 || (progress.answered > 0 && progress.mastery < 70));
 })
 .sort((a, b) => {
 const pa = active.progressByPoint[a.id];
 const pb = active.progressByPoint[b.id];
 return (pb.incorrect - pa.incorrect) || (pa.mastery - pb.mastery) || (a.order - b.order);
 });
}

export function getProfileProgress(state, catalog = []) {
 const active = state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0];
 const completed = catalog.filter((point) => active.progressByPoint[point.id]?.completed).length;
 return {
 completed,
 total: catalog.length,
 percent: catalog.length ? Math.round((completed / catalog.length) * 100) : 0,
 points: active.points,
 stars: active.stars,
 streak: active.streak,
 };
}

export { todayKey };
