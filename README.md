# 咕咕嘎嘎 · 二游玩家人格测试

一款面向二游玩家的原创人格测试网页应用。它会根据角色偏好、内容体验、投入节律和同好互动等游戏场景中的选择，生成一组由“核心人格”和“共鸣人格”组成的人格档案。

> 这里的“人格”描述的是当前二游偏好与游玩方式，仅供娱乐与自我观察，不是心理诊断，也不评价消费、练度或玩法高低。

## 在线体验

[打开 GitHub Pages](https://ai-ideology.github.io/gugugaga-test/)

## 主要功能

- 动态自适应题路：根据回答从正式题库中选择后续问题。
- 多重人格结果：基于 36 个底层特征、11 个人格 Family 和 73 种二游人格生成结果。
- 抽卡式人格揭晓：依次翻开 A 级共鸣人格和 S 级核心人格卡。
- 人格图鉴与详情：浏览全部人格、典型行为和结果说明。
- 人格档案与分享图：生成完整结果页，并可导出分享图片。
- 本地进度保存：答题状态保存在浏览器 `localStorage`，无需账号或后端。
- 响应式与无障碍：支持桌面和移动端，并适配系统“减少动态效果”设置。

## 技术栈

- React 19
- TypeScript 5.8
- Vite 7
- React Router 7（`HashRouter`）
- Vitest + Testing Library
- Playwright
- html-to-image

项目为纯静态前端，不需要后端服务、数据库或环境变量。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

## 测试与构建

```bash
# 单元测试
npm test

# 单元测试监听模式
npm run test:watch

# 生产构建
npm run build

# GitHub Pages 子路径构建
npm run build:pages

# 端到端测试
npm run test:e2e
```

首次运行端到端测试前，需要安装 Playwright Chromium：

```bash
npx playwright install chromium
```

## 内容与目录

```text
src/          React 页面、数据解析、评分引擎与样式
e2e/          Playwright 端到端测试
方案/         正式题库、底层特征、人格体系与结果文案数据源
doc/          内容维护说明与设计文档
resources/    页面使用的 WebP 人格形象资源
public/       公共静态资源
```

应用在构建时直接读取 `方案/` 中的结构化 Markdown：

- `二游玩家身份测试_正式题库_v0.1.md`
- `二游玩家身份测试_36底层特征与题目覆盖矩阵_v0.1.md`
- `二游玩家身份系统_身份体系冻结版_v0.6.1.md`
- `二游玩家73身份_结果页文案扩展版_v0.1.md`

工程内部为兼容评分数据仍保留 `identity` 命名，面向玩家的界面统一使用“人格”。具体修改方式参见 [`doc/内容配置与修改说明.md`](doc/内容配置与修改说明.md)。

## GitHub Pages

推送到 `main` 分支后，GitHub Actions 会自动构建并发布 `dist/`。工作流使用 Vite 的 `pages` 模式，将静态资源基路径设置为 `/gugugaga-test/`；本地开发和普通构建仍使用根路径。

如需部署到其他仓库名，请同步修改 `vite.config.ts` 中的 Pages `base`。

## 内容与素材说明

- 题目、人格名称与结果文案均为本项目内容。
- 人格形象不包含具体商业游戏名称、角色名称或官方素材。
- 仓库未附带开源许可证；除非另有说明，项目内容与视觉素材保留原有权利。
