<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EffectList from '../components/EffectList.vue'
import MonsterList from '../components/MonsterList.vue'
import SegmentTabs from '../components/SegmentTabs.vue'
import StatCard from '../components/StatCard.vue'
import { getHsrVersions } from '../services/hsrStatic'
import { getSeasonComputed } from '../services/endgame'
import { fmtInt } from '../utils/format'

const props = defineProps({
  mode: { type: String, required: true },
  id: { type: Number, required: true },
})

const router = useRouter()

const ver = ref('')

const loading = ref(false)
const error = ref('')
const data = ref(null)

const stageKey = ref('')
const showStageSelector = computed(() => props.mode === 'peak')

let ac = null

function stopLoading() {
  ac?.abort()
  ac = null
}

async function ensureVersion() {
  if (ver.value) return
  const res = await getHsrVersions()
  ver.value = res.latest
}

async function load() {
  stopLoading()
  ac = new AbortController()

  loading.value = true
  error.value = ''

  try {
    await ensureVersion()
    const computedSeason = await getSeasonComputed(props.mode, ver.value, props.id, { signal: ac.signal })
    data.value = computedSeason
    if (showStageSelector.value) stageKey.value = computedSeason.stages?.[0]?.key || ''
  } catch (e) {
    if (e?.name !== 'AbortError') error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.mode, props.id, ver.value],
  () => {
    if (!ver.value) return
    load()
  },
)

onMounted(async () => {
  await ensureVersion()
  load()
})

onBeforeUnmount(stopLoading)

const modeLabel = computed(() => {
  const m = props.mode
  if (m === 'moc') return '忘却之庭'
  if (m === 'fiction') return '虚构叙事'
  if (m === 'doom') return '末日幻影'
  if (m === 'peak') return '异相仲裁'
  return m
})

const versionLabel = computed(() => (ver.value ? `local-cache · ${ver.value}` : 'local-cache'))
const stagePanelTitle = computed(() => '关卡')
const stagePanelSub = computed(() => '优先显示高难度关卡。')
const totalLabel = computed(() => (props.mode === 'peak' ? '仲裁项总HP' : '阶段总HP'))
const effectTitle = computed(() => (props.mode === 'doom' ? '赛季效果' : '本期环境效果'))
const stageEffectTitle = computed(() => (props.mode === 'peak' ? '当前关卡效果' : '当前阶段补充效果'))
const seasonTitle = computed(() => data.value?.label || `${modeLabel.value} #${props.id}`)

const stageTabs = computed(() => {
  const stages = data.value?.stages || []
  if (!stages.length) return []
  return stages.map(s => ({ value: s.key, label: s.name }))
})

const activeStage = computed(() =>
  showStageSelector.value ? (data.value?.stages || []).find(s => s.key === stageKey.value) || null : (data.value?.stages || [])[0] || null,
)

const stageStats = computed(() => {
  const s = activeStage.value
  if (!s) return { total: 0, nodes: 0, waves: 0, count: 0, extraNodes: 0 }
  const groups = s.groups || []
  return {
    total: s.totalHp || 0,
    nodes: groups.length,
    waves: groups.reduce((sum, group) => sum + ((group.waves || []).length || 0), 0),
    count: (s.monsters || []).reduce((a, b) => a + (b.count || 0), 0),
    extraNodes: groups.filter(group => group.key === 'extra').length,
  }
})

function back() {
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push({ name: 'trends', params: { mode: props.mode } })
}

</script>

<template>
  <div class="layout">
    <section class="hero">
      <div class="hero-top">
        <button class="back" type="button" @click="back">
          <span class="back-ic" aria-hidden="true"></span>
          返回趋势
        </button>

        <div class="actions">
          <div class="version-pill">{{ versionLabel }}</div>
          <div v-if="mode === 'peak'" class="tag">无星启</div>
          <div v-else-if="data?.isStar" class="tag star">星启</div>
          <div v-else class="tag">非星启</div>
        </div>
      </div>

      <div class="hero-main">
        <div class="hero-copy">
          <div class="hero-kicker">{{ modeLabel }}</div>
          <h1 class="hero-title">
            <span class="id">#{{ id }}</span>
            <span class="name">{{ seasonTitle }}</span>
          </h1>
          <p class="hero-desc">
            {{ mode === 'peak' ? '按关卡拆分查看每一路敌人、关卡效果与总 HP 构成。' : '按节点与波次展开查看怪物图片、弱点、数量与总 HP。' }}
          </p>
        </div>

        <div class="hero-aside">
          <div class="hero-chip">数据版本 · {{ ver || 'latest' }}</div>
          <div class="hero-chip">{{ activeStage?.name || '阶段详情' }}</div>
          <div class="hero-chip">{{ stageStats.nodes }} 节点 / {{ stageStats.waves }} 波</div>
        </div>
      </div>
    </section>

    <div v-if="error" class="state bad">
      <div class="state-title">加载失败</div>
      <div class="state-sub">{{ error }}</div>
      <button class="btn" type="button" @click="load">重试</button>
    </div>

    <div v-else-if="loading" class="state">
      <div class="state-title">正在加载</div>
      <div class="state-sub">正在拉取赛季数据并计算怪物血量…</div>
    </div>

    <div v-else-if="data" class="grid">
      <aside class="left">
        <EffectList v-if="data.effects?.length" :title="effectTitle" :items="data.effects" />
        <template v-if="mode === 'doom'">
          <EffectList v-if="data.nodeEffects?.side1?.length" title="节点 1 效果" :items="data.nodeEffects.side1" />
          <EffectList v-if="data.nodeEffects?.side2?.length" title="节点 2 效果" :items="data.nodeEffects.side2" />
          <EffectList v-if="data.nodeEffects?.side3?.length" title="星启模式效果" :items="data.nodeEffects.side3" />
        </template>
        <div v-if="showStageSelector" class="panel">
          <div class="panel-title">{{ stagePanelTitle }}</div>
          <SegmentTabs :model-value="stageKey" :items="stageTabs" @update:model-value="v => (stageKey = v)" />
          <div class="panel-sub">{{ stagePanelSub }}</div>
        </div>
        <EffectList v-if="activeStage?.effects?.length" :title="stageEffectTitle" :items="activeStage.effects" />
      </aside>

      <section class="main">
        <div class="stats">
          <StatCard :label="totalLabel" :value="fmtInt(stageStats.total)" tone="warn" :sub="mode === 'peak' ? '已按仲裁项总HP口径汇总' : '已按关卡总HP口径汇总'" />
          <StatCard label="节点数" :value="`${stageStats.nodes}`" :sub="stageStats.extraNodes ? `含 ${stageStats.extraNodes} 个追加轮次节点` : '按当前关卡节点统计'" />
          <StatCard label="波次数" :value="`${stageStats.waves}`" sub="按节点内所有波次汇总" />
          <StatCard label="怪物数量" :value="`${stageStats.count}`" sub="按出场数量统计" />
        </div>

        <div class="block">
          <div class="block-hd">
            <div class="block-title">敌人波次</div>
            <div class="block-sub">按节点与波次展开，已带上怪物图片、弱点与总HP</div>
          </div>
          <MonsterList :stage="activeStage" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.layout {
  max-width: 1260px;
  min-height: max(1280px, calc(100vh + 920px));
  margin: 0 auto;
}

.hero {
  position: relative;
  overflow: hidden;
  padding: 18px;
  border-radius: 30px;
  background:
    linear-gradient(140deg, color-mix(in oklab, var(--surface-strong) 88%, transparent), color-mix(in oklab, var(--surface) 92%, transparent)),
    radial-gradient(120% 160% at 0% 0%, color-mix(in oklab, var(--acc2) 18%, transparent) 0%, transparent 48%),
    radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, var(--acc) 22%, transparent) 0%, transparent 55%);
  border: 1px solid color-mix(in oklab, var(--line-strong) 68%, transparent);
  box-shadow: var(--shadow-soft);
}

.hero::after {
  content: '';
  position: absolute;
  inset: auto -14% -42% auto;
  width: clamp(180px, 28vw, 340px);
  aspect-ratio: 1;
  border-radius: 999px;
  background: radial-gradient(circle, color-mix(in oklab, var(--acc) 24%, transparent) 0%, transparent 68%);
  pointer-events: none;
}

.hero-top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.hero-main {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  display: grid;
  gap: 18px;
}

.back {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  padding: 11px 14px;
  border-radius: 16px;
  background: color-mix(in oklab, var(--surface-soft) 86%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  color: var(--text);
  cursor: pointer;
}

.back-ic {
  width: 10px;
  height: 10px;
  border-left: 2px solid color-mix(in oklab, var(--acc2) 80%, white);
  border-bottom: 2px solid color-mix(in oklab, var(--acc2) 80%, white);
  transform: rotate(45deg);
}

.hero-copy {
  max-width: 760px;
}

.hero-kicker {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.hero-title {
  margin: 10px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: baseline;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.06;
}

.hero-desc {
  margin: 14px 0 0;
  max-width: 56ch;
  color: color-mix(in oklab, var(--muted) 88%, white);
  line-height: 1.65;
}

.hero-aside {
  display: grid;
  gap: 10px;
  align-content: start;
}

.hero-chip {
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 16px;
  background: color-mix(in oklab, var(--surface-soft) 86%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
  color: color-mix(in oklab, var(--text) 92%, white);
}

.id {
  font-weight: 760;
  letter-spacing: 0.01em;
}

.name {
  font-size: clamp(18px, 2vw, 24px);
  color: color-mix(in oklab, var(--muted) 86%, white);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.version-pill {
  border-radius: 16px;
  padding: 10px 12px;
  background: color-mix(in oklab, var(--bg-1) 88%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  color: var(--text);
  font-size: 12px;
}

.tag {
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  background: color-mix(in oklab, var(--bg-2) 78%, transparent);
  color: var(--muted);
  font-size: 12px;
  font-weight: 650;
}

.tag.star {
  color: color-mix(in oklab, var(--warn) 95%, white);
  border-color: color-mix(in oklab, var(--warn) 30%, var(--line));
}

.state {
  margin-top: 12px;
  padding: 18px 14px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--surface) 90%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
}

.state.bad {
  border-color: color-mix(in oklab, var(--bad) 40%, var(--line));
}

.state-title {
  font-weight: 760;
}

.state-sub {
  margin-top: 10px;
  color: var(--muted);
  white-space: pre-line;
  line-height: 1.5;
}

.btn {
  margin-top: 12px;
  border-radius: 16px;
  padding: 10px 12px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--acc) 18%, var(--bg-1)), color-mix(in oklab, var(--acc2) 10%, var(--bg-1)));
  border: 1px solid color-mix(in oklab, var(--acc) 48%, var(--line));
  color: var(--text);
  cursor: pointer;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  align-items: start;
}

.left {
  display: grid;
  gap: 14px;
}

.panel {
  border-radius: 22px;
  padding: 14px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface) 88%, transparent), color-mix(in oklab, var(--surface-soft) 90%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 74%, transparent);
}

.panel-title {
  font-size: 14px;
  font-weight: 720;
  margin-bottom: 10px;
}

.panel-sub {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

.main {
  display: grid;
  gap: 14px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.block {
  border-radius: 22px;
  padding: 14px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface) 88%, transparent), color-mix(in oklab, var(--surface-soft) 90%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 74%, transparent);
}

.block-hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.block-title {
  font-weight: 760;
}

.block-sub {
  font-size: 12px;
  color: var(--muted);
}

@media (min-width: 880px) {
  .hero-main {
    grid-template-columns: minmax(0, 1fr) 240px;
    align-items: end;
  }
}

@media (min-width: 1040px) {
  .grid {
    grid-template-columns: 360px 1fr;
  }

  .stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .hero {
    padding: 16px;
    border-radius: 24px;
  }

  .hero-title {
    gap: 8px;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .block-hd {
    display: grid;
  }
}
</style>
