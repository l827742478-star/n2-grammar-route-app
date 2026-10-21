import { getQuestionSet } from './content/questions.js';
import { getModuleStats, getSearchText, findPointById } from './content/content-utils.js';
import { getProfileProgress, getWeakPoints } from './state.js';
import { makeRoute } from './router.js';

export function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function activeProfile(state) {
  return state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0];
}

function progressFor(state, point) {
  return state.progressByPoint?.[point.id] || { correct: 0, incorrect: 0, completed: false, mastery: 0 };
}

function pointStatus(progress) {
  if (progress.completed && progress.mastery >= 80) return '已掌握';
  if (progress.incorrect > 0) return '待复盘';
  if (progress.completed) return '已解锁';
  return '未开始';
}

function firstPattern(catalog) {
  return catalog[0]?.pattern || 'あげく（に）';
}

const ROUTE_LABELS = {
  home: '今日',
  catalog: '目录',
  knowledge: '知识',
  weak: '薄弱',
  leaderboard: '榜单',
  point: '知识点',
  practice: '闯关',
};

export function viewModelForRoute(route, state, catalog) {
  const point = route.params?.pointId ? findPointById(route.params.pointId, catalog) : null;
  const progress = getProfileProgress(state, catalog);
  const weak = getWeakPoints(state, catalog);
  const base = { title: 'N2每日语法闯关', patterns: [firstPattern(catalog)], point: null };
  switch (route.name) {
    case 'catalog':
      return { ...base, title: '语法地图', modules: getModuleStats(catalog), patterns: catalog.map((item) => item.pattern) };
    case 'knowledge':
      return { ...base, title: '知识检索', patterns: catalog.map((item) => item.pattern) };
    case 'weak':
      return { ...base, title: '复盘台', weak, patterns: weak.length ? weak.map((item) => item.pattern) : [firstPattern(catalog)] };
    case 'leaderboard':
      return { ...base, title: '本地榜单', patterns: [firstPattern(catalog)] };
    case 'point':
      return { ...base, title: point ? point.pattern : '找不到这个语法点', point, patterns: point ? [point.pattern] : base.patterns };
    case 'practice':
      return { ...base, title: point ? `闯关 · ${point.pattern}` : '开始闯关', point, patterns: point ? [point.pattern] : base.patterns };
    default:
      return { ...base, title: '今日航线', progress, weak, patterns: [firstPattern(catalog)] };
  }
}

function navMarkup(route) {
  const links = [
    ['home', '今日', '🏠'],
    ['catalog', '目录', '📚'],
    ['weak', '薄弱', '🎯'],
    ['knowledge', '知识', '💡'],
    ['leaderboard', '榜单', '🏆'],
  ];
  return `<nav class="bottom-nav" aria-label="主导航">${links.map(([name, label, icon]) => `<a class="nav-item ${route.name === name ? 'is-active' : ''}" href="${makeRoute({ name, params: {} })}"><span class="nav-icon">${icon}</span><span>${label}</span></a>`).join('')}</nav>`;
}

function shellHeader(state, route, catalog) {
  const profile = activeProfile(state);
  const progress = getProfileProgress(state, catalog);
  return `<header class="topbar">
    <div class="topbar-inner"><a class="brand" href="#/home" aria-label="返回N2每日语法闯关"><span class="brand-mark">N2</span><span class="brand-copy"><strong>N2每日语法闯关</strong><small>共 ${catalog.length} 个语法关卡</small></span></a>
    <div class="topbar-meta"><span class="chip">⭐ ${progress.stars}</span><span class="chip chip-gold">💎 ${progress.points}</span><button class="profile-trigger" data-action="open-profile" type="button" aria-label="切换学习档案"><span class="avatar">${escapeHTML(profile.name.slice(0, 1))}</span><span class="profile-name">${escapeHTML(profile.name)}</span><span aria-hidden="true">⌄</span></button></div></div>
  </header>
  <div class="route-strip"><span class="route-kicker">N2 · ${escapeHTML(ROUTE_LABELS[route.name] || '今日')}</span><span>${progress.completed}/${progress.total} 已通关 · ${progress.percent}% 完成</span></div>`;
}

function pointCard(point, state, mode = 'knowledge') {
  const p = progressFor(state, point);
  return `<article class="point-card" data-point-card data-search="${escapeHTML(getSearchText(point))}">
    <div class="point-card-head"><span class="level-no">${String(point.order).padStart(3, '0')}</span><span class="status status-${p.completed ? 'done' : p.incorrect ? 'weak' : 'new'}">${pointStatus(p)}</span></div>
    <a class="point-pattern" href="${makeRoute({ name: mode === 'practice' ? 'practice' : 'point', params: { pointId: point.id } })}">${escapeHTML(point.pattern)}</a>
    <p>${escapeHTML(point.meaning)}</p>
    <div class="point-foot"><span>${escapeHTML(point.module)}</span><span>${p.incorrect ? `错题 ${p.incorrect}` : `${p.correct} 次正确`}</span></div>
  </article>`;
}

export function renderHome(state, catalog) {
  const profile = activeProfile(state);
  const progress = getProfileProgress(state, catalog);
  const weak = getWeakPoints(state, catalog);
  const challengeIds = state.dailyChallenge?.pointIds?.length ? state.dailyChallenge.pointIds : catalog.slice(0, 10).map((point) => point.id);
  const challenge = challengeIds.map((id) => findPointById(id, catalog)).filter(Boolean);
  const recommended = weak[0] || catalog.find((point) => !progress.completed || !state.progressByPoint?.[point.id]?.completed) || catalog[0];
  const completedToday = state.dailyChallenge?.completed?.length || 0;
  const totalStars = catalog.length;
  return `<section class="view view-home" data-view="home">
    <section class="kidbar card"><span class="home-avatar">${escapeHTML(profile.name.slice(0, 1))}</span><div class="kid-info"><strong>${escapeHTML(profile.name)}</strong><small>积分 ${profile.points} 分 · 已通关 ${progress.completed} 关</small></div><button class="switch-button" data-action="open-profile" type="button">切换 / 添加</button></section>
    <section class="dash" aria-label="学习数据"><div class="stat-card"><span>✅</span><strong>${progress.completed} <small>/ ${progress.total}</small></strong><em>已通关</em></div><div class="stat-card"><span>💎</span><strong>${progress.points}</strong><em>我的积分</em></div><div class="stat-card"><span>⭐</span><strong>${progress.stars} <small>/ ${totalStars}</small></strong><em>总星星</em></div><div class="stat-card"><span>📈</span><strong>${progress.percent}<small>%</small></strong><em>完成度</em></div></section>
    <section class="today-card card"><div class="daybadge">第 ${Math.max(1, profile.streak || 1)} 天</div><div class="today-main"><div class="today-icon" aria-hidden="true">🗺️</div><div><span class="tag">今日语法闯关</span><h1>第 ${String(recommended.order).padStart(3, '0')} 关 · ${escapeHTML(recommended.pattern)}</h1><p class="today-module">${escapeHTML(recommended.module)} · ${escapeHTML(recommended.meaning)}</p><p class="today-hint">${escapeHTML(recommended.connection)}</p></div></div><a class="btn btn-primary btn-wide" href="${makeRoute({ name: 'practice', params: { pointId: recommended.id } })}">▶ 开始今日闯关（5 题）</a></section>
    <div class="section-heading"><h2>🗺️ 学习路线图</h2><span>${completedToday}/10 今日完成</span></div><div class="road">${challenge.map((point, index) => `<a class="route-node phase ${state.dailyChallenge?.completed?.includes(`${point.id}-q1`) ? 'is-done' : ''}" href="${makeRoute({ name: 'practice', params: { pointId: point.id } })}"><span class="node-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHTML(point.pattern)}</strong><small>${escapeHTML(point.meaning)}</small></span><span class="node-arrow">${state.dailyChallenge?.completed?.includes(`${point.id}-q1`) ? '✓' : '›'}</span></a>`).join('')}</div>
  </section>`;
}

export function renderCatalog(state, catalog) {
  const stats = getModuleStats(catalog);
  return `<section class="view" data-view="catalog"><div class="view-heading"><div><p class="eyebrow">语法地图 · ${catalog.length} 个关卡</p><h1>语法地图</h1><p>每一个编号都是一个独立语法点。模块只负责导航，不改变关卡计数。</p></div><div class="heading-stamp">${Object.keys(stats).length}<small>模块</small></div></div><div class="catalog-toolbar"><label class="search-field"><span>⌕</span><input data-search-input type="search" placeholder="搜语法、中文含义、接续或例句" /></label><span class="filter-note">共 ${catalog.length} 个独立关卡</span></div><div class="module-grid">${Object.keys(stats).map((module) => `<section class="module-section"><div class="module-title"><span class="module-pin"></span><h2>${escapeHTML(module)}</h2><span>${stats[module].count} 关</span></div><div class="point-grid">${catalog.filter((point) => point.module === module).map((point) => pointCard(point, state)).join('')}</div></section>`).join('')}</div></section>`;
}

export function renderKnowledge(state, catalog) {
  return `<section class="view" data-view="knowledge"><div class="view-heading"><div><p class="eyebrow">知识笔记 · 可检索</p><h1>知识检索</h1><p>先从句型、接续或中文意思找到线索，再打开研究卡。</p></div></div><label class="search-field search-field-large"><span>⌕</span><input data-search-input type="search" placeholder="例如：尽管、に基づいて、Vた・Nの" autofocus /></label><div class="knowledge-list">${catalog.map((point) => pointCard(point, state)).join('')}</div></section>`;
}

export function renderWeak(state, catalog) {
  const weak = getWeakPoints(state, catalog);
  return `<section class="view" data-view="weak"><div class="view-heading"><div><p class="eyebrow">复盘台 · ${weak.length} 个待复习</p><h1>复盘台</h1><p>错过的题不会消失，它们会变成下一次路线的信号。</p></div><div class="heading-stamp accent">${weak.length}<small>待复盘</small></div></div>${weak.length ? `<div class="weak-grid">${weak.map((point) => pointCard(point, state, 'practice')).join('')}</div>` : `<div class="empty-state"><span class="empty-mark">✓</span><h2>目前没有薄弱点</h2><p>先去今日航线完成第一站，答错的题会自动出现在这里。</p><a class="btn btn-primary" href="#/home">回到今日航线</a></div>`}</section>`;
}

export function renderLeaderboard(state, catalog) {
  const profiles = [...state.profiles].sort((a, b) => b.points - a.points);
  return `<section class="view" data-view="leaderboard"><div class="view-heading"><div><p class="eyebrow">本地榜单 · 仅本机</p><h1>本地榜单</h1><p>只记录这台设备上的学习档案，不连接真实用户。</p></div></div><div class="board-layout"><div class="board-card">${profiles.map((profile, index) => `<div class="board-row ${profile.id === state.activeProfileId ? 'is-you' : ''}"><span class="rank">${String(index + 1).padStart(2, '0')}</span><span class="board-avatar">${escapeHTML(profile.name.slice(0, 1))}</span><span class="board-name"><strong>${escapeHTML(profile.name)}</strong><small>${profile.stars} 颗星 · ${profile.points} 积分</small></span><span class="board-score">${profile.points}</span></div>`).join('')}</div><aside class="profile-card"><span class="eyebrow">档案管理</span><h2>学习档案</h2><div class="profile-list">${profiles.map((profile) => `<button class="profile-row ${profile.id === state.activeProfileId ? 'is-active' : ''}" data-profile-id="${escapeHTML(profile.id)}" type="button"><span>${escapeHTML(profile.name)}</span><small>${profile.points} 积分</small></button>`).join('')}</div><form data-profile-form class="add-profile-form"><input name="name" placeholder="添加一个档案" maxlength="24" /><button class="btn btn-secondary" type="submit">＋ 添加</button></form><button data-action="reset-profile" class="danger-link" type="button">重置当前档案</button></aside></div></section>`;
}

export function renderPoint(state, point) {
  if (!point) return `<section class="empty-state"><h2>找不到这个语法点</h2><a class="btn btn-primary" href="#/catalog">回到目录</a></section>`;
  return `<section class="view" data-view="point"><div class="detail-hero"><div><p class="eyebrow">第 ${String(point.order).padStart(3, '0')} 站 / ${escapeHTML(point.module)}</p><h1>${escapeHTML(point.pattern)}</h1><p class="detail-meaning">${escapeHTML(point.meaning)}</p></div><span class="register-tag">${escapeHTML(point.register)}</span></div><div class="detail-grid"><main class="research-card"><div class="evidence-block"><span class="block-label">01 / 接续</span><strong>${escapeHTML(point.connection)}</strong><p>${escapeHTML(point.usage)}</p></div><div class="evidence-block"><span class="block-label">02 / 精讲</span><p>${escapeHTML(point.explanation)}</p></div><div class="examples-block"><span class="block-label">03 / 例句证据</span>${point.examples.map((example, index) => `<div class="example-row"><span>0${index + 1}</span><div><p class="ja-line">${escapeHTML(example.ja)}</p><p>${escapeHTML(example.zh)}</p></div></div>`).join('')}</div><div class="compare-grid"><div><span class="block-label">04 / 易错点</span><p>${escapeHTML(point.pitfalls)}</p></div><div><span class="block-label">相关表达</span><p>${escapeHTML(point.related)}</p></div></div></main><aside class="detail-aside"><div class="aside-sticky"><span class="eyebrow">准备练习了吗？</span><h2>把它放进语境里。</h2><p>完成 5 道小题，答对后这站会被标记为已解锁。</p><a class="btn btn-primary btn-wide" href="${makeRoute({ name: 'practice', params: { pointId: point.id } })}">开始专项闯关 →</a><a class="text-link" href="#/catalog">返回语法地图</a></div></aside></div></section>`;
}

function feedbackMarkup(feedback) {
  if (!feedback) return '';
  return `<div class="feedback ${feedback.correct ? 'feedback-good' : 'feedback-bad'}"><strong>${feedback.correct ? '答对了 · 路线继续' : '先记下这个分岔'}</strong><p>${escapeHTML(feedback.explanation)}</p>${!feedback.correct ? `<p class="answer-reveal">正确答案：<b>${escapeHTML(feedback.answer)}</b></p>` : ''}</div>`;
}

export function renderPractice(state, point, ui = {}) {
  if (!point) return `<section class="empty-state"><h2>没有可练习的语法点</h2><a class="btn btn-primary" href="#/catalog">回到目录</a></section>`;
  const questions = getQuestionSet(point);
  const index = Math.max(0, Math.min(Number(ui.questionIndex) || 0, questions.length - 1));
  const question = questions[index];
  const selected = ui.selectedOrder || [];
  const answerControl = question.type === 'choice'
    ? `<div class="choice-list">${question.options.map((option) => `<label class="choice-option"><input type="radio" name="answer" value="${escapeHTML(option)}" ${ui.answer === option ? 'checked' : ''} /><span>${escapeHTML(option)}</span></label>`).join('')}</div>`
    : question.type === 'fill'
      ? `<input class="fill-input" name="answer" value="${escapeHTML(ui.answer || '')}" placeholder="输入语法表达" autocomplete="off" />`
      : `<div class="order-board" data-order-board>${selected.map((token) => `<button class="order-token is-picked" data-order-picked="${escapeHTML(token)}" type="button">${escapeHTML(token)}</button>`).join('') || '<span class="order-placeholder">点击下方片段组成句子</span>'}</div><div class="token-bank">${question.tokens.map((token, tokenIndex) => `<button class="order-token" data-order-token="${escapeHTML(token)}" data-token-index="${tokenIndex}" type="button" ${selected.includes(token) ? 'disabled' : ''}>${escapeHTML(token)}</button>`).join('')}</div>`;
  const answerValue = question.type === 'order' ? selected.join('') : (ui.answer || '');
  return `<section class="view practice-view" data-view="practice" data-answer-value="${escapeHTML(answerValue)}"><div class="practice-top"><a class="back-link" href="${makeRoute({ name: 'point', params: { pointId: point.id } })}">← 知识点</a><span>第 ${String(point.order).padStart(3, '0')} 站 / ${escapeHTML(point.pattern)}</span><span>${index + 1} / ${questions.length}</span></div><div class="practice-card"><div class="practice-question"><p class="eyebrow">第 ${String(index + 1).padStart(2, '0')} 题</p><h1>${escapeHTML(question.prompt).replaceAll('\n', '<br />')}</h1><form data-answer-form data-question-id="${escapeHTML(question.id)}" data-point-id="${escapeHTML(point.id)}" data-question-index="${index}">${answerControl}<button class="btn btn-primary btn-wide" type="submit">提交答案 <span>↗</span></button></form>${feedbackMarkup(ui.feedback)}</div></div>${ui.feedback ? `<div class="next-actions"><button class="btn btn-secondary" data-action="next-question" type="button">${index + 1 >= questions.length ? '完成这一站' : '下一题 →'}</button><a class="text-link" href="#/weak">去复盘台</a></div>` : ''}</section>`;
}

export function renderApp(root, state, route, catalog, ui = {}) {
  const view = route.name === 'home' ? renderHome(state, catalog)
    : route.name === 'catalog' ? renderCatalog(state, catalog)
      : route.name === 'knowledge' ? renderKnowledge(state, catalog)
        : route.name === 'weak' ? renderWeak(state, catalog)
          : route.name === 'leaderboard' ? renderLeaderboard(state, catalog)
            : route.name === 'point' ? renderPoint(state, findPointById(route.params?.pointId, catalog))
              : renderPractice(state, findPointById(route.params?.pointId, catalog), ui);
  root.innerHTML = `<div class="app-shell">${shellHeader(state, route, catalog)}<main class="main-content">${view}</main>${navMarkup(route)}<div class="profile-popover" data-profile-popover hidden></div></div>`;
}
