# 项目总结（agents.md）

## 项目目标

本项目用于统计并可视化《崩坏：星穹铁道》终局内容（忘却之庭 / 虚构叙事 / 末日幻影 / 异相仲裁）不同期数的怪物血量膨胀趋势，并提供“单期详情”查看敌人节点、波次、怪物图片、弱点与血量构成。

## 技术栈

- 前端：Vue 3（`<script setup>`）+ Vue Router 4
- 构建：Vite
- 图表：ECharts
- 包管理：pnpm
- Node：>= 24

## 数据来源与版本策略

- 数据来源：`https://static.nanoka.cc`
- 版本策略：默认使用 `manifest.hsr.latest`（代表线上测试服最新数据）
- 本项目目的：统计最新数据，不做“版本差异比较”

## 模式与统计口径

### 忘却之庭（moc）

- 统计口径：仅统计最后一个关卡（最高难度层）
- 星启模式：从 `1033` 起存在。数据结构表现为“新增一个节点（节点3）”，应计入总量。
- 多阶段 HP：部分 boss 的真实总血量不只看单段 `HPBase`，还要乘上 `monstervalue.json` 里的 `PhaseList.phase_max_hp_ratio` 总和；例如 `1033` 的两个 boss 都是 `HP × 2`。

### 虚构叙事（fiction）

- 统计口径：仅统计最后阶段（阶段 4）
- 星启模式：从 `2024` 起存在。数据结构表现为“新增一个节点（节点3）”，应计入总量。

### 末日幻影（doom）

- 统计口径：仅统计最后阶段（阶段 4）
- 星启模式：从 `3018` 起存在。数据结构可能提供第 3 路（`event_id_list3`）；展示上命名为“星启模式”。
- 环境/赛季效果：存在与节点绑定的效果列表（`buff_list1/2/3`），在详情页按节点分栏展示。

### 异相仲裁（peak）

- 异相仲裁没有“阶段”概念，本项目按关卡拆分（包括 `pre_level`，以及 `boss_level=将杀王棋`、`boss_config.hard_name=将杀王棋·绝境`）。
- 不区分星启模式。
- 趋势口径：整期仲裁项总 HP 汇总。

## 名词定义（统一口径）

- 节点：代表几路（节点1/2/3）。星启模式本质是新增一路（新增一个节点）。
- 波次：每个节点内部的波次（波次 1/2/3...）。

## 核心实现概览

### 数据与缓存

文件：`src/services/hsrStatic.js`

- 默认缓存优先：内存缓存 + `localStorage` 持久缓存
- 本地种子 JSON：优先从 `public/local-cache` 读取（用于离线对比和减少网络请求）
- 当前前端按纯静态展示口径工作：页面直接读取 `public/local-cache`，本地缺失的数据应通过同步脚本补齐，而不是页面内手动刷新。

### HP 计算与怪物信息

文件：`src/services/hpCalc.js`

- 读取数据表：`monster.json / monstervalue.json / HardLevelGroup.json / EliteGroup.json / InfiniteEliteGroup.json`
- HP 公式：`HPBase * HPModifyRatio * HardLevelRatio * EliteRatio`
- 多阶段血量：若 `monstervalue.json` 存在 `PhaseList`，总 HP 还要乘上所有 `phase_max_hp_ratio` 的和
- 怪物图片：使用 `monstermiddleicon/Monster_{id}.webp`，实例怪物 9 位 id 自动回退到基础 id
- 怪物数量：同一波次内相同怪物会聚合计数（显示 x2 / x3），总 HP = 单体 HP * 多阶段倍率 * count

### 终局聚合与趋势

文件：`src/services/endgame.js`

- 忘却/虚构/末日：只取最终关卡（最终阶段）的总 HP
- 星启节点合并：当数据结构提供新增节点时，合并为节点3参与统计
- 赛季去重：当“名称相同且 id 差值 <= 2”时，保留更小 id，避免重复统计

### UI 结构

- `src/views/HpTrendsPage.vue`：趋势页（看板 + 折线图 + 期数列表）
- `src/views/SeasonDetailPage.vue`：赛季详情页（效果 + 节点/波次怪物卡片）
- `src/components/MonsterList.vue`：节点/波次怪物卡片渲染（图片/弱点/HP/xN）

### 当前交互约束

- 顶部大区不再使用“随滚动自动收起”的交互；当前采用固定模式切换栏 + 普通文档流 banner 的结构，避免 PC 阅读区被大面积遮挡。
- 路由切换默认保持浏览器当前滚动位置：模式切换、进入详情、详情返回都不应把页面主动滚到顶部。
- `src/router/index.js` 的滚动策略当前按“返回 `false`，不接管滚动”维护；若后续调整，需要先验证趋势页与详情页的滚动连续性。
- 详情页加载态需要保留足够页面高度，避免页面瞬时变短导致浏览器把当前滚动值夹断。

### 组件布局约定

- `src/components/SegmentTabs.vue` 当前支持两种布局口径：
  - `layout="fill"`：用于短标签筛选项，按钮等宽铺满容器。
  - 默认 `rail`：用于长标签或关卡切换，优先保证单个按钮可读性。
- `rail` 模式在移动端保留横向滚动能力；在 PC 端优先换行，避免长中文标签彼此遮挡或压进相邻信息卡。
- 异相仲裁（`peak`）详情页的“关卡”切换按钮按长标签处理，桌面端应允许自动换行，不应为了单行展示牺牲可读性。

## 本地 JSON 预置（落盘）

目录：`public/local-cache/`

目的：将关键接口数据以 JSON 形式预先放入项目中；后续排查问题优先读本地文件，减少网络请求。

更新命令：

```bash
pnpm sync:data
```

同步完成后会自动额外生成：

- `public/local-cache/hsr/<ver>/cache-plan.json`
- `public/local-cache/hsr/<ver>/moc-phase-hp-audit.json`

其中 `moc-phase-hp-audit.json` 用于记录忘却之庭里所有命中多阶段 HP 倍率的历史赛季与怪物，便于核对哪些赛季的总血量会因为 `PhaseList` 而变动。

可指定版本与需要落盘的赛季 id：

```bash
pnpm sync:data -- --ver 4.3.56 --moc 1033,1032 --peak 8
```

如需单独重跑审计：

```bash
pnpm audit:moc-phase-hp -- --ver 4.3.56
```

## 开发命令

```bash
pnpm dev
pnpm build
pnpm preview
```
