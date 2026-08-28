# 开发、测试与部署流程

## 常用命令

```bash
pnpm install            # 安装依赖（要求 Node >= 24）
pnpm dev                # 本地开发，端口 5173（strictPort）
pnpm build              # 生产构建到 dist/
pnpm preview            # 预览构建产物

pnpm test:unit          # node --test tests/*.test.js
pnpm sync:data:check    # 数据源协议校验（--dry-run，等价于 sync:data 的校验部分）
pnpm sync:data          # 协议校验；不再复制文件到 public
pnpm audit:moc-phase-hp # 忘却之庭多阶段 HP 审计，产物只写 .hsr-cache/audit/
pnpm deploy:netlify     # 调 scripts/deploy-netlify.sh 发布生产
```

覆盖数据源地址（排障用）：

```bash
HSR_DATA_SITE_URL=https://example-data-site.netlify.app pnpm sync:data
pnpm sync:data -- --download .hsr-cache/shared-data   # 下载离线副本，仅排障
```

## 测试

- 运行器是 Node 内置 `node:test`，**没有 jsdom / vitest**。
- 测试里手工伪造浏览器环境：`globalThis.window = { localStorage }` + `globalThis.fetch`（见 `tests/endgame-precomputed.test.js`）。服务层代码要求 `window` 存在，新增测试沿用同一 `installBrowser()` 模式。
- 现有覆盖：预计算趋势命中、单期预计算命中、回退复算时的受控并发（≤6）与输入顺序保持。
- 新增口径测试时：构造最小化的 `monster/monstervalue/HardLevelGroup/EliteGroup/InfiniteEliteGroup` + 单期详情，断言 `getTrend` / `getSeasonComputed` 的 total 与结构。

## 数据协议校验脚本

`scripts/sync-shared-data.js`：

1. 拉 `manifest.json`，取 `hsr.latest`；
2. 校验必需版本文件：`character/lightcone/monster/monstervalue/HardLevelGroup/EliteGroup/InfiniteEliteGroup/maze/maze_extra/maze_boss/maze_peak.json`；
3. 用与前端一致的口径（`normalizeSeasonList` + 名称去重）推导四模式当前赛季，并校验对应详情文件可达；
4. 默认只打印结果，不落盘；`--download <dir>` 时才写离线副本。

上游新增赛季/语言时只需跑本脚本确认协议不破。**不要**把任何数据复制进 `public/`。

## 部署

- 平台：Netlify；`netlify.toml` 只有构建命令（`pnpm build`）、发布目录（`dist`）、Node 24 与 SPA 回退重写（`/* → /index.html`）。**没有也不需要**数据代理重定向。
- `scripts/deploy-netlify.sh` 处理登录态（`.netlify-config` 内隔离的 XDG 配置）与生产发布；登录用 `pnpm netlify:login`。
- 构建注意：`vite.config.js` 把 echarts 单独拆 chunk，`chunkSizeWarningLimit: 2000`。

## 排障手册

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 页面显示旧赛季数据 | 数据源更新但 localStorage 缓存未失效 | 缓存键按版本号隔离（`hsr-endgame:json:<ver>:<path>`）；版本号变化即失效。手工清站点 localStorage 可强制刷新 |
| `manifest.hsr.latest 不存在` | 数据源 manifest 结构变化或不可达 | 直接访问 `https://static.nanoka.cc/manifest.json` 确认 |
| 趋势为空/报错但详情正常 | 某期详情 404 或结构变化 | 用 `pnpm sync:data` 校验；再看 `pickStages` 是否认得新结构 |
| 某怪物 HP 明显偏低 | 漏了多阶段倍率或精英/难度倍率 | 对照 [statistics.md](./statistics.md) 公式；跑 `pnpm audit:moc-phase-hp` |
| 怪物图空白 | 数据源缺图或 9 位实例 id 未归一 | 确认 `normalizeMonsterKey` / icon 推导；缺图只允许显示占位 |
| 请求被中止报错 | 切换模式/页面触发 `AbortController` | 属预期；错误处理需先判 `signal.aborted`，不要误报 |

## 变更检查清单

### 新增一种终局模式

1. 数据源先发布对应期数索引与详情目录。
2. `src/services/hsrStatic.js`：`MODES` 加条目（`listPath / detailPath / idMin`）。
3. `src/services/endgame.js`：`pickStages` 分支、`isStarSeason`（无星启则返回 false）、`buildEffects`、`seasonTotalForTrend`。
4. `scripts/sync-shared-data.js`：`REQUIRED_VERSION_FILES` / `MODE_LIST_FILES` / `MODE_DETAIL_DIRS`。
5. UI：模式切换栏与路由可复用（`:mode` 参数化）；确认 `SegmentTabs` 标签长度是否需要 `rail` 布局。
6. 跑 `pnpm sync:data`、`pnpm test:unit`，抽查趋势页与详情页。

### 数据结构变化（新赛季形态）

1. 先 `pnpm sync:data -- --download` 拉样本到 `.hsr-cache/` 观察原始 JSON。
2. 改 `pickMocStages / pickStoryStages / pickBossStages / pickPeakStages` 与 `buildStageGroups`。
3. 补 `tests/` 用例（构造新结构样本）。
4. 若影响预计算结构 → 提升 `PRECOMPUTED_SCHEMA_VERSION`（`src/services/endgame.js:4`）。
5. 同步更新 [statistics.md](./statistics.md) 与根 `AGENTS.md` 的口径说明。

### UI / 交互改动

1. 对照 [ui-interaction.md](./ui-interaction.md) 的约束清单逐项确认，尤其是滚动连续性与加载态高度。
2. `pnpm dev` 起本地服务实际过一遍：趋势页 ↔ 详情 ↔ 返回、四种模式、星启筛选、窄屏形态。

### 口径类改动（HP 公式、去重、星启阈值）

1. 改代码 + 改文档（本目录 + 根 `AGENTS.md` + README 口径章节）一起做。
2. `pnpm test:unit` + `pnpm audit:moc-phase-hp`。
3. 用详情页节点 HP 之和与趋势图数值交叉验证。
