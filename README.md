# HSR 终局血量膨胀看板

统计并可视化《崩坏：星穹铁道》终局内容（**忘却之庭 / 虚构叙事 / 末日幻影 / 异相仲裁**）不同期数的怪物血量膨胀趋势，并支持单期详情查看敌人节点、波次、怪物图片、弱点与血量构成。

## 功能特性

- **趋势总览**：四种终局模式的累计 HP 折线图、看板数值、期数列表
- **赛季详情**：每个赛季的节点 / 波次 / 怪物卡片，含图片、弱点、HP 与多阶段倍率（x2、x3）
- **星启模式识别**：自动识别并展示「节点 3」与「星启模式」新增关卡
- **云端预计算**：优先读取数据中心的趋势与单期 HP 派生数据，缺失时自动回退到前端复算
- **多阶段 HP 审计**：忘却之庭 boss 的真实总 HP 需乘 `PhaseList.phase_max_hp_ratio` 总和，支持独立审计脚本

## 技术栈

| 类别   | 选型                                    |
| ------ | --------------------------------------- |
| 框架   | Vue 3（`<script setup>`）+ Vue Router 4 |
| 构建   | Vite                                    |
| 图表   | ECharts                                 |
| 包管理 | pnpm（要求 Node ≥ 24）                  |
| 部署   | Netlify                                 |

## 快速开始

```bash
# 安装依赖
pnpm install

# 本地开发
pnpm dev

# 生产构建
pnpm build

# 本地预览构建产物
pnpm preview
```

## 数据准备

```bash
# 校验独立数据站协议
pnpm sync:data:check

# 校验数据站；默认不写 public
pnpm sync:data

# 可选下载离线副本到 .hsr-cache
pnpm sync:data -- --download .hsr-cache/shared-data

# 单独审计忘却之庭多阶段 HP
pnpm audit:moc-phase-hp
```

统一数据源为 `https://hsr-data-hub.netlify.app`。当前项目通过同源 `/local-cache/*` 与 `/assets/hsr/*` 代理读取，不再从竞速仓库复制目录，也不直接请求第三方数据或图片。版本使用共享数据的 `manifest.hsr.latest` 与 `manifest.hsr.releaseId`。

## `public/local-cache` 数据目录

`/local-cache/` 是独立数据站的兼容协议。数据中心完成发布前，生产部署优先使用仓库内同名目录的离线副本；Netlify 代理只处理本地不存在的路径，避免上游 404 遮蔽已打包文件。怪物图片使用相同策略。

```text
public/local-cache/
├── manifest.json                         # 全游戏版本索引，HSR 使用 manifest.hsr.latest
└── hsr/<ver>/
    ├── monster.json                      # 怪物基础信息：名称、弱点、图标、子 id
    ├── monstervalue.json                 # 怪物数值：HPBase、HPModifyRatio、HardLevelGroup、EliteGroup、PhaseList
    ├── HardLevelGroup.json               # 等级难度倍率，按 HardLevelGroup + Level 匹配
    ├── EliteGroup.json                   # 常规精英倍率
    ├── InfiniteEliteGroup.json           # 无限/特殊精英倍率
    ├── maze.json                         # 忘却之庭期数索引
    ├── maze_extra.json                   # 虚构叙事期数索引
    ├── maze_boss.json                    # 末日幻影期数索引
    ├── maze_peak.json                    # 异相仲裁期数索引
    ├── cache-plan.json                   # 本次落盘计划与已缓存赛季 id
    ├── moc-phase-hp-audit.json           # 忘却之庭多阶段 HP 命中审计
    ├── computed/
    │   └── endgame/
    │       ├── trends.json              # 四种模式的轻量趋势结果
    │       └── <locale>/<mode>/<id>.json # 单期节点、波次、怪物与 HP 结果
    └── <locale>/
        ├── maze/<id>.json                # 忘却之庭单期详情
        ├── story/<id>.json               # 虚构叙事单期详情
        ├── boss/<id>.json                # 末日幻影单期详情
        └── peak/<id>.json                # 异相仲裁单期详情
```

模式与文件映射：

| 模式 | 期数索引 | 单期详情目录 | 说明 |
| --- | --- | --- | --- |
| `moc` | `maze.json` | `<locale>/maze/<id>.json` | 忘却之庭 |
| `fiction` | `maze_extra.json` | `<locale>/story/<id>.json` | 虚构叙事 |
| `doom` | `maze_boss.json` | `<locale>/boss/<id>.json` | 末日幻影 |
| `peak` | `maze_peak.json` | `<locale>/peak/<id>.json` | 异相仲裁 |

其他项目应直接读取数据站或自己的同源代理，不再复制业务仓库目录：

```js
const root = '/local-cache'
const manifest = await fetch(`${root}/manifest.json`).then(res => res.json())
const ver = manifest.hsr.latest
const locale = 'zh'

const plan = await fetch(`${root}/hsr/${ver}/cache-plan.json`).then(res => res.json())
const mocList = await fetch(`${root}/hsr/${ver}/maze.json`).then(res => res.json())
const latestMocId = plan.currentSeasonIds.moc
const latestMocDetail = await fetch(`${root}/hsr/${ver}/${locale}/maze/${latestMocId}.json`).then(res => res.json())
```

注意事项：

- `cache-plan.json` 记录当前版本、语言、各模式当前赛季 id、已落盘赛季 id 和索引文件名；下游项目应优先用它判断本地是否已有详情 JSON。
- `manifest.hsr.latest` 是默认版本入口；如果要固定某次数据快照，可直接写死 `hsr/<ver>/...`。
- 详情 JSON 是上游原始结构镜像，不是本项目聚合后的趋势结果。若要复算 HP，需要结合 `monster.json`、`monstervalue.json`、`HardLevelGroup.json`、`EliteGroup.json` / `InfiniteEliteGroup.json`。
- 派生数据单独放在 `computed/endgame/`，不回写上游原始详情。根对象必须带 `schemaVersion: 1`、`ver`、`releaseId` 与 `generatedAt`；前端只消费与当前 release 和 schema 兼容的结果。
- 多阶段敌人的真实 HP 需要乘 `monstervalue.json` 中 `PhaseList.phase_max_hp_ratio` 的总和；可用 `moc-phase-hp-audit.json` 快速核对忘却之庭命中的赛季与怪物。
- 怪物图片统一读取本站 `/assets/hsr/monsters/Monster_<id>.webp`；9 位实例怪物 id 通常需要回退到基础怪物 id。源站缺图时页面显示本地占位，不再回退第三方地址。
- 原始期数列表可能包含历史或展示用条目；本项目趋势层还会做“名称相同且 id 差值 ≤ 2 时保留更小 id”的赛季去重。

## 部署

```bash
pnpm deploy:netlify
```

调用 `scripts/deploy-netlify.sh` 完成登录态恢复与生产发布。`netlify.toml` 为 `/local-cache/*`、`/assets/hsr/*` 保留数据站代理，但不强制覆盖 `dist` 中已存在的离线副本。

## 项目结构

```
src/
├── views/              # 页面
│   ├── HpTrendsPage.vue     # 趋势总览页
│   └── SeasonDetailPage.vue # 赛季详情页
├── components/         # 通用组件
│   ├── EChartView.vue       # ECharts 封装
│   ├── EffectList.vue       # 末日幻影环境效果
│   ├── MonsterList.vue      # 节点 / 波次怪物卡片
│   ├── SeasonRail.vue       # 赛季切换
│   ├── SegmentTabs.vue      # 模式 / 关卡切换
│   └── StatCard.vue         # 看板数值卡
├── services/
│   ├── hsrStatic.js         # 数据加载（内存 + localStorage + 本地 JSON）
│   ├── hpCalc.js            # HP 公式与怪物信息
│   └── endgame.js           # 终局聚合与趋势
├── router/             # 路由（保持滚动连续性）
├── utils/format.js     # 数值与文本格式化
└── styles/app.css      # 全局样式
```

## 名词与口径

- **节点**：代表几路（节点 1/2/3）。星启模式本质是新增一路。
- **波次**：节点内部的子关卡（波次 1/2/3...）。
- **忘却之庭 / 虚构叙事 / 末日幻影**：只统计最后一个关卡 / 最后一个阶段的总 HP。
- **虚构叙事星启节点**：`2024` 起可能通过阶段 4 后的无名 `level` 表达节点 3；该结构需要并入阶段 4，而不是作为独立阶段展示。
- **异相仲裁**：按关卡拆分（含 `pre_level` 与 `将杀王棋` / `将杀王棋·绝境` 难度），整期仲裁项总 HP 汇总，不区分星启模式。

### 业务规则

- **赛季去重**：名称相同且 ID 差值 ≤ 2 时，仅保留更小 ID。
- **HP 公式**：`HPBase × HPModifyRatio × HardLevelRatio × EliteRatio`；存在 `PhaseList` 时再乘所有 `phase_max_hp_ratio` 之和。
- **怪物图片**：使用本地 `/assets/hsr/monsters/Monster_{id}.webp`；9 位实例怪物 ID 自动回退到 7 位基础 ID，源站缺图使用本地占位。
- **怪物数量**：同波次相同怪物聚合计数（x2、x3），总 HP = 单体 HP × 多阶段倍率 × count。
- **虚构叙事无限波**：优先使用 `infinite_list*.monster_group_id_list` 统计敌人，并合并普通 `monster_list` 中无限波未包含的敌人，避免漏掉虚构集合体等补充怪或覆盖原始波次怪物。

### 血量预计算发布约定

- `hsr-data-hub` 在每次 release 的原始 JSON 同步、校验完成后生成 `computed/endgame/`，并与该 release 原子发布。
- `trends.json` 根对象使用 `{ schemaVersion, ver, releaseId, generatedAt, modes }`，`modes.moc|fiction|doom|peak` 均为 `{ id, label, total, isStar }[]`。
- 单期文件在现有 `getSeasonComputed()` 结果上增加 `{ schemaVersion, releaseId, generatedAt }`，保留 `modeKey / ver / id / effects / nodeEffects / stages`。
- 生成期仍以 `src/services/endgame.js` 的统计口径为准；更改 HP 公式、星启节点或无限波规则时，必须提升 `schemaVersion` 或重建当前 release。
- 预计算文件不可用时，趋势页使用 6 路受控并发复算，详情页使用原有单期复算，不因数据中心派生件缺失而不可用。

## 开发约定

- 顶部大区固定为「模式切换栏 + 普通文档流 banner」，不随滚动收起
- 路由切换保持浏览器当前滚动位置（`src/router/index.js` 滚动策略返回 `false`）
- 详情页加载态保留足够页面高度，避免瞬时变短导致滚动值夹断
- `SegmentTabs` 两种布局：`fill`（短标签等宽铺满）/ `rail`（长标签优先可读，PC 端自动换行）
- 使用缩写形式（`:checked="showRealtimePreview"`）而非 `v-model:checked`，并手动同步

更多上下文见 [AGENTS.md](./AGENTS.md)。
