# 数据源协议与缓存

核心文件：`src/services/hsrStatic.js`（数据加载）、`src/services/hpCalc.js`（基础表消费）。

## 统一数据源

- `DATA_SITE = 'https://static.nanoka.cc'`（`src/services/hsrStatic.js:10`），已开放 `Access-Control-Allow-Origin: *`。
- 页面所有 JSON 与怪物图片都**直连数据源绝对地址**读取；本站不代理、不落盘、不随构建发布数据文件。`public/` 只有自有小体积资源（轮播 banner、favicon）。
- Node 脚本可用环境变量 `HSR_DATA_SITE_URL` 覆盖（`scripts/sync-shared-data.js`、`scripts/audit-moc-phase-hp.js`）。

## 路径协议

```text
https://static.nanoka.cc/
├── manifest.json                          # 版本索引，HSR 读 manifest.hsr.latest
├── assets/hsr/monstermiddleicon/
│   └── Monster_<id>.webp                  # 怪物中图
└── hsr/<ver>/
    ├── monster.json                       # 怪物基础信息：名称、弱点、图标、子 id
    ├── monstervalue.json                  # 数值：HPBase、child[].HPModifyRatio、PhaseList
    ├── HardLevelGroup.json                # 难度倍率（HardLevelGroup + Level 联合键）
    ├── EliteGroup.json                    # 常规精英倍率
    ├── InfiniteEliteGroup.json            # 无限/特殊精英倍率
    ├── maze.json | maze_extra.json | maze_boss.json | maze_peak.json   # 四模式期数索引
    ├── computed/endgame/                  # 可选预计算件，当前数据源未发布（404 → 回退复算）
    │   ├── trends.json
    │   └── <locale>/<mode>/<id>.json
    └── <locale>/maze|story|boss|peak/<id>.json   # 单期详情（上游原始结构镜像）
```

模式映射定义在 `MODES`（`src/services/hsrStatic.js:19`）：

| modeKey | 期数索引 | 详情路径 | idMin |
| --- | --- | --- | --- |
| `moc` | `maze.json` | `<locale>/maze/<id>.json` | 1000 |
| `fiction` | `maze_extra.json` | `<locale>/story/<id>.json` | 1000 |
| `doom` | `maze_boss.json` | `<locale>/boss/<id>.json` | 1000 |
| `peak` | `maze_peak.json` | `<locale>/peak/<id>.json` | 0 |

`idMin` 用于过滤历史/展示用条目（`normalizeSeasonList`）。

### 赛季名称字段的可靠性

上游**新赛季的名称字段可能整体缺省**：实测 4.5.53 的 `maze_boss.json["3022"]` 的 `zh / en / ja / ko` 全为 `null`，`zh/boss/3022.json` 的 `name` 也是 `null`，赛季名「末法余烬」只存在于 `buff.name`（末日幻影）/ `option[].name`（虚构叙事）/ `group_name`（忘却之庭）这类效果名里。

- 显示名一律走 `buildSeasonLabel(modeKey, seasonId, detail, effects)`（`src/services/endgame.js:314`）：先取详情的 `name / group_name / zh / en`，为空再回退到本期效果名，最后才是 `<模式名> #id`。**顶部轮播也复用这一份**（`App.vue` 曾自己写过一套没有效果名回退的版本，导致轮播与详情页标题不一致）。
- 只有期数索引可用的场景**无法回退**：趋势页期数列表（`SeasonRail`）、趋势轴标签与 tooltip、以及详情页下拉里非当前的那些期，缺名时显示裸 id（如 `3022`）。这是上游数据缺口，等下个数据版本自然补齐，**不要在本项目里硬编码赛季名或向上游补数据**。
- `normalizeSeasonList` 的取值顺序是 `zh → name → en → String(id)`，只有英文名（或只有 `ko/ja`）的赛季不会退化成 id。

## 版本策略

- 默认版本入口 `manifest.hsr.latest`；`getHsrVersions()` 要求 `latest` 存在，否则抛错（`src/services/hsrStatic.js:172`）。
- 数据源当前不发布 `releaseId`：`activeReleaseId` 回退为版本号，仅用于缓存隔离（`getManifest()`，`src/services/hsrStatic.js:161`）。预计算件的 `releaseId` 校验因此被跳过（见下文）。
- 数据源不发布 `cache-plan.json`：各模式当前赛季由期数索引去重后的最大 id 推导（`getCurrentSeasonIds()`，`src/services/endgame.js:115`）。

## 缓存分层（fetchJson）

`fetchJson(path, { signal, force })`（`src/services/hsrStatic.js:123`）：

1. **内存缓存** `jsonMemoryCache`：同一路径同会话只解析一次。
2. **请求去重** `jsonRequestCache`：并发请求共享同一 Promise。
3. **localStorage 持久缓存**：键为 `hsr-endgame:json:<releaseKey>:<path>`，`releaseKey` 为 manifest 用 `'manifest'`，其余用 `activeReleaseId`（版本号）。写满时静默忽略。
4. 网络失败时回退到 localStorage 缓存；`signal` 已 abort 的失败直接抛出，不走回退。
5. 响应必须是 `ok` 且 content-type 为 JSON，否则视为失败。

`force: true` 可绕过所有缓存（目前没有页面入口使用）。

> 已知限制：第 3 层的原料持久化受 localStorage 单源约 5MB 配额约束。5 张 HP 基础表原样 stringify 就约 2.1MB（`monstervalue.json` 单表 1.2MB），加期数详情会写满并静默失败——因此**不要把兜底能力寄托在原料缓存上**，有效的持久层是下面的派生结果缓存。

## 派生趋势缓存（readTrendCache / writeTrendCache）

趋势复算要吃 5 张基础表（约 2.09MB）+ 全部期数详情（4.5.52 的 moc 为 36 期、约 1.5MB），而结果只有每期 `{id, label, total, isStar}` 四个字段、同一数据版本内确定性可复现，所以**落盘结果而不是原料**（`src/services/hsrStatic.js:90`）。

- 键：`hsr-endgame:trend:<ver>:<releaseId|no-release-id>:<modeKey>`，版本或 releaseId 变化即自然失效；写入后清理非当前版本的趋势键。
- 值：`{ schema: 1, items: [...] }`；读取时校验 `schema`、数组形状以及每项的 `id` / `total` 可用，不合规一律按未命中处理。
- 消费方只有 `getTrend()`：本地 → 云端预计算 → 实时复算，每层只补缺口，因此星启筛选切换能复用重叠部分。
- 改变趋势口径时提升 `TREND_CACHE_SCHEMA`（`hsrStatic.js:3`）。
- 详情页的 `getSeasonComputed()` **不走**该缓存：单期结构体量大且各期互不复用，缓存原料才会撑爆配额。

## 预计算件（可选）

- 路径：`/hsr/<ver>/computed/endgame/trends.json` 与 `.../<locale>/<mode>/<id>.json`（`src/services/endgame.js:12`）。
- 接受条件（`isCompatiblePrecomputedRoot`，`endgame.js:20`）：`schemaVersion === 1` 且 `ver` 一致；若数据源发布了 `releaseId` 则还要求匹配，未发布则跳过该校验。
- 单期文件还需 `modeKey`、`id` 匹配且 `stages` 为数组。
- **当前数据源未发布该目录**：单期详情每次都回退实时复算；趋势则先查本地派生缓存，未命中才探测 `trends.json`（当前必然 404）再走 6 路受控并发复算（`FALLBACK_CONCURRENCY`）。
- 若将来改变统计口径导致预计算结构变化，必须提升 `PRECOMPUTED_SCHEMA_VERSION`（`endgame.js:4`）。

## 怪物图片

- 基址 `MONSTER_ICON_BASE = ${DATA_SITE}/assets/hsr/monstermiddleicon`（`hsrStatic.js:13`）。
- 图标解析（`src/services/hpCalc.js:52`）：优先用 `monster.json` 里 `meta.icon` 的文件名；否则按 id 推导——9 位及以上实例 id 先除以 100 取基础 id，再向下取整到 10 的倍数。
- `meta.icon` 支持非数字名（正则 `[0-9A-Za-z_]+`）：如 `虚构集合体 8003060`、`破晓战队 5013090` 的图标为 `Monster_Unknown.png`，对应数据源已发布的 `Monster_Unknown.webp` 占位徽标（与上游站点一致）。
- 查表同样有 id 归一化：先按原 id 查 `monstervalue/monster`，查不到时回退 `Math.floor(id / 100)`（`normalizeMonsterKey`，`hpCalc.js:32`）。
- 缺图返回空字符串，由 `MonsterList.vue` 显示占位，**不回退其他第三方图床**。

## 富文本处理

上游文本带游戏内富文本标记，展示前必须处理（`hsrStatic.js:201`）：

- `stripRichText()`：还原 `\n`，去掉 `<unbreak>` / `<color=...>` / `<u>` / `<br>` 标记。
- `applyParams(desc, param)`：替换 `#1[i]%`（数字 ×100 变百分比）与 `#1[i]`（原值）占位符。
- 效果格式化入口：`formatEffects()`（通用，末日幻影的 `buff_list1/2/3` 与异相仲裁的 `buff_list` 都走它）、`formatStoryEffects()`（虚构叙事 `option` + `sub_option`）。末日幻影整期效果只取 `detail.buff`，不经这两个入口。

## 维护约束

- 详情 JSON 保持上游原始结构镜像；聚合逻辑只存在于 `src/services/endgame.js`，不要写回数据源。
- 不要把数据源 JSON 下载到 `public/` 发布——会抵消直连改造的带宽收益。
- 数据源新增语言或赛季时，本项目只需跑 `pnpm sync:data` 校验协议（详见 [workflow.md](./workflow.md)）。
- 页面不允许引入数据源之外的第三方图片/数据地址。
