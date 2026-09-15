# UI 结构与交互约束

页面入口：`src/App.vue`（外壳 + 顶栏 + 轮播 banner），两个路由页在 `src/views/`，通用组件在 `src/components/`。全局样式集中在 `src/styles/app.css`，数值格式化在 `src/utils/format.js`。

## 路由

`src/router/index.js`：

| 路径                | 页面               | 说明                         |
| ------------------- | ------------------ | ---------------------------- |
| `/`                 | —                  | 重定向 `/trends/moc`         |
| `/trends/:mode`     | `HpTrendsPage`     | mode ∈ moc/fiction/doom/peak |
| `/season/:mode/:id` | `SeasonDetailPage` | id 转 Number 传入            |
| `/:pathMatch(.*)*`  | —                  | 未知路径重定向 `/trends/moc` |

`scrollBehavior()` 返回 `false`：**路由不接管滚动**。模式切换、进详情、返回都保持浏览器当前滚动位置。改动滚动策略前必须先验证趋势页 ↔ 详情页的滚动连续性。

`router.afterEach` 只负责 `document.title`（`忘却之庭血量趋势 · 终局血量趋势` / `忘却之庭 #1036 · 终局血量趋势`），供多标签页与分享场景辨识；**不要**在这里做滚动或取数。`index.html` 的 `description` / OG 标签是静态兜底，不随路由更新（本站无 SSR）。

## 页面职责

### App.vue（外壳）

- 固定模式切换栏 + 普通文档流轮播 banner（`public/banners/*` 自有资源）。banner 是静态数组配置，含模式标签、标题、备注与跳转链接。
- 轮播 5.2s 自动切换，但**鼠标悬停 / 键盘聚焦 `.hero-visual` 时暂停**（`slidePaused`），且 `prefers-reduced-motion: reduce` 下不启动定时器；改轮播节奏时保留这两条，否则用户读不完 banner 文案。
- 相关项目推广位 `PromoSlot` 是 `hero-shell` 的**第一个子节点**（固定切换栏之下、hero 面板之上），随头部普通文档流滚动；**不要**再放回 main 与 footer 之间，页脚只保留“更新记录”“联系我们”两个入口。
- 页脚两个入口放在 `.footer-actions` 组内，共用 `.footer-btn` 基类（`.footer-btn-ver` / `.footer-btn-new` 只挂在更新记录按钮上）：
  - `更新记录`：展示站点版本号，有未读版本时带 `NEW` 徽标；点击打开 `ChangelogModal`。
  - `联系我们`：纯文字 pill；点击打开 `ContactModal`，联系方式是组件内静态常量，无未读态。
- **不要**恢复“顶部大区随滚动自动收起”的旧交互——会遮挡 PC 阅读区。
- 模式切换按钮**不做同模式早退**（`goMode` 直接 push）：在详情页点当前模式的 tab 应回到该模式趋势页，早退会造成“点了没反应”。
- 轮播只覆盖 `bannerModes` 三种模式，取当前赛季时传 `getCurrentSeasonIds(ver, { modes })`，不要为 peak 多拉一份期数索引。
- 页脚提示只描述“首次加载会计算、结果按游戏版本缓存在本机、版本更新自动失效”，**不要**再写“建议切换版本”（UI 上没有版本切换入口）。

### HpTrendsPage.vue（趋势页）

- 看板数值卡（`StatCard`）+ 折线图（`EChartView`）+ 期数列表（`SeasonRail`）。
- 星启筛选 `starFilter`：`all / star / nostar`；peak 不区分星启（切到 peak 会把 `starFilter` 复位为 `all`）。
- **`模式 + starFilter` 共同构成取数口径**：口径变化时（点三枚星启按钮、切模式）期数选中集一律重置为新口径的**全集**，不能与旧选中集取交集——否则「全部 → 星启 → 全部」会停在星启那几期，点「全部」看起来毫无反应。只有同口径内的重载（如失败重试）才用交集保留 `SeasonRail` 上的手动勾选。
- 数据流：`getHsrVersions()` → `getSeasons()` → `getTrend()`（`onProgress` 驱动进度）。
- **增量出图**：`getTrend` 的 `onItems` 回调在复算过程中分批回填已得结果，首访（无本地缓存）时图表先画已完成期数、随后补齐；命中缓存时该回调只发一次全量。改造成“一次性赋值”会让首访图表等到全部复算完成才出现。
- **点击数据点进详情**：`EChartView` 向上 emit echarts 的 `click`，页面用 `params.dataIndex` 映射 `filteredTrend` 拿 id。`dataIndex` 依赖“图表 series 顺序 === `filteredTrend` 顺序”，不要在其中夹排序。
- 未知 `mode`（手输或旧链接）在 `load()` 内 `router.replace` 回 `/trends/moc`，不停在永不恢复的失败态。
- 每次重载用 `AbortController` 中止上一次请求，并配自增序号守卫：只有仍是最新一次请求时才写回 `seasons` / `trend` / `error` 与 `loading`，否则被中止的上一次请求会在新请求还在加载时把 `loading` 提前置 false，图表停留在旧口径数据上。

### SeasonDetailPage.vue（赛季详情页）

- 展示整期效果 + 关卡切换（仅 peak 显示）+ 各节点的怪物卡片（`MonsterList`）；doom 有按节点分栏的效果（`EffectList`）。
- 有赛季切换浮层（`switchOpen`），可跳相邻赛季。
- **与趋势页同款的 `loadSeq` 序号守卫**：快速连跳赛季时，被中止的上一次请求不得提前把 `loading` 置 false（否则会闪一下空白内容）。新增异步写回点时必须带 `if (seq !== loadSeq) return`。
- 进 `load()` 先校验 `MODES[props.mode]` 与 `Number.isInteger(props.id)`，不合法直接落错误态（`/season/xxx/1`、`?id=NaN` 都走这里），不要把异常留给取数层。
- **加载态必须保留足够页面高度**：页面瞬时变短会把浏览器当前滚动值夹断，返回时位置丢失。
- **peak 模式约束**：顶部“赛季增益效果”区块（标题为 `data.effects`，源是 `detail.boss_config.buff_list`）只在选中 `boss_level`（将杀王棋）或 `boss_config`（将杀王棋·绝境）时才渲染，对应 stage 携带 `isBossStage: true` 标记；选中前置关卡时该区块隐藏，`activeStage.effects`（当前关卡效果）不受影响。

## 组件约定

| 组件                 | 职责              | 关键点                                                                                        |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `EChartView.vue`     | ECharts 封装      | 接收 option，负责 resize 与销毁；向上 emit echarts `click`；option 是整体替换的 computed，**浅监听**即可（deep 会白扫大数组） |
| `MonsterList.vue`    | 节点/波次怪物卡片 | 图片直连数据源，缺图占位；弱点、HP、xN 聚合、多阶段倍率标记；数值一律 `fmtInt`，字段缺失显示 `-`（不要 `x?.toLocaleString() ?? '-'`，可选链结果为 undefined 时 `??` 不生效会渲染出 "undefined"） |
| `SeasonRail.vue`     | 期数列表          | 多选（`toggle`）、`select-recent/select-all`、`open` 进详情；`stats` prop（`{ [id]: { total } }`）让卡片直接显示总 HP 与环比，未回填时显示“未计算” |
| `SegmentTabs.vue`    | 模式/关卡切换     | `layout="fill"` 等宽铺满；默认 `rail` 长标签                                                  |
| `StatCard.vue`       | 看板数值卡        | 纯展示                                                                                        |
| `EffectList.vue`     | 环境/赛季效果     | 纯展示 `{ name, desc }[]`                                                                     |
| `ChangelogModal.vue` | 站点更新记录弹窗  | Props `open`，Emits `close`；遮罩点击关闭；Esc / 滚动锁定 / 焦点管理来自 `useModalDismiss`     |
| `ContactModal.vue`   | 联系方式弹窗      | Props `open`，Emits `close`；同上共用 `useModalDismiss`（组件内只留“关闭时清 copiedKey”这类自有逻辑）；复制走 `navigator.clipboard`，邮箱另有 `mailto:` 直发 |
| `PromoSlot.vue`      | 相关项目推广位    | 纯展示，文案集中在组件内 `promo` 常量；渲染在头部顶端，外链 `target="_blank" rel="noopener noreferrer"` |

### 弹窗共用行为（`src/composables/useModalDismiss.js`）

`useModalDismiss({ open, close, focusRef })` 收口三件事：Esc 关闭、打开时锁定 `body` 滚动并补偿滚动条宽度（关闭时还原原值）、焦点落到关闭按钮。**新增覆盖层弹窗必须复用它**，不要在组件里再抄一份（历史上两个弹窗各持一份，已合并）。`open` 传 getter（`() => props.open`）即可跟随 props 变化。

### SegmentTabs 布局

- `layout="fill"`：短标签（如星启筛选），按钮等宽铺满容器。
- 默认 `rail`：长标签或关卡切换，优先保证单个按钮可读性；移动端横向滚动，**PC 端自动换行**。
- peak 详情页的关卡按钮（将杀王棋 / 将杀王棋·绝境）按长标签处理，桌面端必须允许换行，不要为单行牺牲可读性。

## 格式化

`src/utils/format.js`：`fmtInt`（千分位）、`fmtShort`（K/M/B，两位小数裁零）、`fmtPct`（×100 百分比）、`escapeHtml`。展示数值统一走这里，不要手写 toLocaleString。

任何拼进 HTML 的上游文本都必须先过 `escapeHtml`：目前唯一的 HTML sink 是 `HpTrendsPage.vue` 的 ECharts tooltip `formatter`（返回值按 innerHTML 渲染，`marker` 是 echarts 自己生成的片段、不要转义）。其余渲染路径都是 Vue 插值，自动转义；全站禁止使用 `v-html`。

## 站点版本记录

- 数据源：`src/data/changelog.js` 是唯一数据源；`CHANGELOG` 数组按**新版本在前**排列，站点版本号 `APP_VERSION` 直接取 `CHANGELOG[0].version` 派生，禁止在别处再维护一份版本常量。
- 发布新版本：只需在数组头部插入一条 `{ version, date, title, items }`；`items[].type` 取 `feature / improve / fix / docs`，对应弹窗内的功能/优化/修复/文档徽标。
- 版本号语义化：新增功能升 minor（x.Y.z），修复/文案微调升 patch（x.y.Z）。
- 未读提示：localStorage key `hsr-endgame:changelog-seen-version` 记录已读版本，由 `hasUnreadChangelog()` / `markChangelogSeen()` 读写；打开弹窗即标记已读。
- 展示形态：页脚按钮 + `ChangelogModal` 弹窗时间线，**不新增路由**，避免影响路由滚动连续性；弹窗为 fixed 覆盖层，打开时锁定 body 滚动并补偿滚动条宽度。
- 注意区分：hero 区“当前版本”meta 卡展示的是游戏数据版本（`manifest.hsr.latest`），页脚展示的是站点版本，二者互不相干。

## 联系方式

- 渠道**只有两个**：微信 `cduyzh`（直接添加好友）与邮箱 `cduyzh@gmail.com`。不要新增 QQ / 群 / 第三方表单等渠道，也不要引入留言板——本站不收集任何表单内容。
- 文案常量集中在 `src/components/ContactModal.vue` 的 `CONTACT` 数组（沿用 `PromoSlot` 的 `promo` 做法），**不进 `src/data/`**，不发网络请求。
- 微信不提供「加好友」的网页深链，也拿不到可扫描的加好友二维码，因此微信行只做**展示 + 一键复制**，并给出「到微信搜索该微信号」的引导；不要放生成出来的假二维码图。
- 复制用 `navigator.clipboard.writeText()`；失败（未授权 / 非安全上下文）时静默不显示“已复制”。联系值本身可见且 `user-select: all`，用户可长按选中，所以**不做 `execCommand` 回退**。
- 邮箱行额外给一个 `mailto:` 直发链接（主题预填，`encodeURIComponent` 生成）。
- 与站点版本记录一样：**不新增路由**，用 fixed 覆盖层弹窗，避免影响 `scrollBehavior` 返回 `false` 带来的滚动连续性。

## 交互约束清单

- [ ] 路由切换后滚动位置不变（`scrollBehavior` 返回 `false`）。
- [ ] 顶部结构是固定切换栏 + 文档流 banner，不随滚动收起。
- [ ] 详情页加载/错误态保留足够高度。
- [ ] 怪物图片只来自数据源 `monstermiddleicon`，缺图显示占位。
- [ ] 数据请求可被 `AbortController` 中止，切换时不产生竞态结果覆盖。
- [ ] 样式改动同时看 PC（宽屏换行）与移动端（横向滚动）两种形态。
- [ ] **整页不得横向滚动**：各断点下 `documentElement.scrollWidth === clientWidth`。装饰性出血（hero 光晕）由 `.app-shell { overflow-x: clip }` 收在视口内（`clip` 不建滚动容器、也不成为 fixed 的包含块）；内部含不可收缩内容的栅格/弹性项必须显式 `min-width: 0`（`min-width: auto` 会把 min-content 逐级顶穿到整页），组件内滚动交给自己的 `overflow-x: auto`。
- [ ] 拼进 HTML 的上游文本一律先过 `escapeHtml`（当前唯一 HTML sink 是 tooltip formatter），全站不使用 `v-html`。
- [ ] 联系方式仅微信 + 邮箱两条静态展示，走 `ContactModal` 弹窗，不新增路由、不发网络请求、不引入表单。
- [ ] 覆盖层弹窗的 Esc + 滚动锁定走 `useModalDismiss`，不在组件内复制。
- [ ] 展示数值走 `fmtInt` / `fmtShort`，可缺失字段用 `x == null ? '-' : fmtInt(x)`（不要用 `?.toLocaleString() ?? '-'`）。
- [ ] 详情页与趋势页的异步写回都带 `loadSeq` 守卫；页面级入参（mode/id）先校验再取数。
- [ ] 期数卡片与趋势图的数值来自同一份 `trend` 结果，不要在 `SeasonRail` 里另算口径。
