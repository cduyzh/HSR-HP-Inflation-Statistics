# UI 结构与交互约束

页面入口：`src/App.vue`（外壳 + 顶栏 + 轮播 banner），两个路由页在 `src/views/`，通用组件在 `src/components/`。全局样式集中在 `src/styles/app.css`，数值格式化在 `src/utils/format.js`。

## 路由

`src/router/index.js`：

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | — | 重定向 `/trends/moc` |
| `/trends/:mode` | `HpTrendsPage` | mode ∈ moc/fiction/doom/peak |
| `/season/:mode/:id` | `SeasonDetailPage` | id 转 Number 传入 |

`scrollBehavior()` 返回 `false`：**路由不接管滚动**。模式切换、进详情、返回都保持浏览器当前滚动位置。改动滚动策略前必须先验证趋势页 ↔ 详情页的滚动连续性。

## 页面职责

### App.vue（外壳）

- 固定模式切换栏 + 普通文档流轮播 banner（`public/banners/*` 自有资源）。banner 是静态数组配置，含模式标签、标题、备注与跳转链接。
- **不要**恢复“顶部大区随滚动自动收起”的旧交互——会遮挡 PC 阅读区。

### HpTrendsPage.vue（趋势页）

- 看板数值卡（`StatCard`）+ 折线图（`EChartView`）+ 期数列表（`SeasonRail`）。
- 星启筛选 `starFilter`：`all / star / nostar`；peak 不区分星启。
- 数据流：`getHsrVersions()` → `getSeasons()` → `getTrend()`（`onProgress` 驱动进度）。
- 每次重载用 `AbortController` 中止上一次请求；切换模式/筛选同理。

### SeasonDetailPage.vue（赛季详情页）

- 展示整期效果 + 关卡切换（仅 peak 显示）+ 各节点的怪物卡片（`MonsterList`）；doom 有按节点分栏的效果（`EffectList`）。
- 有赛季切换浮层（`switchOpen`），可跳相邻赛季。
- **加载态必须保留足够页面高度**：页面瞬时变短会把浏览器当前滚动值夹断，返回时位置丢失。
- **peak 模式约束**：顶部“赛季增益效果”区块（标题为 `data.effects`，源是 `detail.boss_config.buff_list`）只在选中 `boss_level`（将杀王棋）或 `boss_config`（将杀王棋·绝境）时才渲染，对应 stage 携带 `isBossStage: true` 标记；选中前置关卡时该区块隐藏，`activeStage.effects`（当前关卡效果）不受影响。

## 组件约定

| 组件 | 职责 | 关键点 |
| --- | --- | --- |
| `EChartView.vue` | ECharts 封装 | 接收 option，负责 resize 与销毁 |
| `MonsterList.vue` | 节点/波次怪物卡片 | 图片直连数据源，缺图占位；弱点、HP、xN 聚合、多阶段倍率标记 |
| `SeasonRail.vue` | 期数列表 | 多选（`toggle`）、`select-recent/select-all`、`open` 进详情 |
| `SegmentTabs.vue` | 模式/关卡切换 | `layout="fill"` 等宽铺满；默认 `rail` 长标签 |
| `StatCard.vue` | 看板数值卡 | 纯展示 |
| `EffectList.vue` | 环境/赛季效果 | 纯展示 `{ name, desc }[]` |

### SegmentTabs 布局

- `layout="fill"`：短标签（如星启筛选），按钮等宽铺满容器。
- 默认 `rail`：长标签或关卡切换，优先保证单个按钮可读性；移动端横向滚动，**PC 端自动换行**。
- peak 详情页的关卡按钮（将杀王棋 / 将杀王棋·绝境）按长标签处理，桌面端必须允许换行，不要为单行牺牲可读性。

## 格式化

`src/utils/format.js`：`fmtInt`（千分位）、`fmtShort`（K/M/B，两位小数裁零）、`fmtPct`（×100 百分比）、`clamp`、`safeText`。展示数值统一走这里，不要手写 toLocaleString。

## 交互约束清单

- [ ] 路由切换后滚动位置不变（`scrollBehavior` 返回 `false`）。
- [ ] 顶部结构是固定切换栏 + 文档流 banner，不随滚动收起。
- [ ] 详情页加载/错误态保留足够高度。
- [ ] 怪物图片只来自数据源 `monstermiddleicon`，缺图显示占位。
- [ ] 数据请求可被 `AbortController` 中止，切换时不产生竞态结果覆盖。
- [ ] 样式改动同时看 PC（宽屏换行）与移动端（横向滚动）两种形态。
