# N2每日语法闯关

这是一个本地优先的 JLPT N2 语法学习 Web 应用。它把每个独立语法点作为一个独立关卡，目录总数由 `src/content/grammar.js` 的 `GRAMMAR_POINTS.length` 自动生成，不写死参考产品的关卡数量。

当前内容目录：**233 个独立语法点 / 233 个关卡**。公开 N2 清单的条目数并不统一，因此本产品采用交叉整理、去重和变体合并后的工作目录；同一个语法点的接续变化和语体变化放在同一关内。

## 本地预览

```bash
python3 -m http.server 4183 --bind 127.0.0.1
```

打开 <http://127.0.0.1:4183/>。

## 路由

- `#/home` 今日航线：十站挑战、推荐语法点、进度和本地积分
- `#/catalog` 语法地图：按模块查看全部关卡
- `#/knowledge` 知识检索：按语法、中文含义、接续和例句搜索
- `#/weak` 复盘台：错误题和低掌握语法点
- `#/leaderboard` 本地榜单：切换、添加和重置学习档案
- `#/point/n2-001` 研究卡：接续、精讲、例句、易错点和专项入口
- `#/practice/n2-001` 专项闯关：选择、填空、排序和即时解析

## 数据和重置

学习状态只保存在浏览器 `localStorage` 的 `n2-grammar-route-state-v1` 中，不连接账号、真实榜单、支付、外部 API、图片或音频。要恢复新鲜状态，可以在浏览器控制台执行：

```js
localStorage.removeItem('n2-grammar-route-state-v1'); location.reload();
```

## 检查

```bash
node tests/content-check.mjs
node tests/question-check.mjs
node tests/state-check.mjs
node tests/app-smoke.mjs
node tests/layout-check.mjs
node work/acceptance-check.mjs
```

浏览器验收需要检查：桌面和窄屏无横向溢出；答错后薄弱页出现对应语法点；答对后刷新页面进度保留；添加/切换/重置档案有效；浏览器控制台无错误。

本交付仅保存在当前本地项目目录，未发布、未推送、未连接外部账号。
