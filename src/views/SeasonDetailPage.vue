<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EffectList from '../components/EffectList.vue'
import MonsterList from '../components/MonsterList.vue'
import SegmentTabs from '../components/SegmentTabs.vue'
import { getHsrVersions } from '../services/hsrStatic'
import { getSeasonComputed, getSeasons } from '../services/endgame'
import { fmtInt, fmtShort } from '../utils/format'

const props = defineProps({
  mode: { type: String, required: true },
  id: { type: Number, required: true },
})

const router = useRouter()

const ver = ref('')

const loading = ref(false)
const error = ref('')
const data = ref(null)
const seasons = ref([])
const switchOpen = ref(false)

const stageKey = ref('')
const showStageSelector = computed(() => props.mode === 'peak')

let ac = null
let closeSwitchTimer = null

function stopLoading() {
  ac?.abort()
  ac = null
}

function closeSeasonSwitch() {
  switchOpen.value = false
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
    const [computedSeason, nextSeasons] = await Promise.all([
      getSeasonComputed(props.mode, ver.value, props.id, { signal: ac.signal }),
      getSeasons(props.mode, ver.value, { starFilter: 'all', signal: ac.signal }),
    ])
    data.value = computedSeason
    seasons.value = nextSeasons
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
    closeSeasonSwitch()
    load()
  },
)

onMounted(async () => {
  await ensureVersion()
  load()
})

onBeforeUnmount(() => {
  stopLoading()
  if (closeSwitchTimer) window.clearTimeout(closeSwitchTimer)
})

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
const seasonOptions = computed(() => seasons.value.slice().sort((a, b) => b.id - a.id))
const currentSeasonOption = computed(() => seasonOptions.value.find(it => it.id === props.id))

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

const detailClass = computed(() => ({
  grid: props.mode === 'peak',
  'detail-stack': props.mode !== 'peak',
}))

const hasTopEffects = computed(() => {
  if (data.value?.effects?.length) return true
  if (activeStage.value?.effects?.length) return true
  if (props.mode !== 'doom') return false
  const nodeEffects = data.value?.nodeEffects || {}
  return Boolean(nodeEffects.side1?.length || nodeEffects.side2?.length || nodeEffects.side3?.length)
})

function back() {
  router.push({ name: 'trends', params: { mode: props.mode } })
}

function toggleSeasonSwitch() {
  switchOpen.value = !switchOpen.value
}

function scheduleCloseSeasonSwitch() {
  if (closeSwitchTimer) window.clearTimeout(closeSwitchTimer)
  closeSwitchTimer = window.setTimeout(closeSeasonSwitch, 120)
}

function cancelCloseSeasonSwitch() {
  if (closeSwitchTimer) window.clearTimeout(closeSwitchTimer)
  closeSwitchTimer = null
}

function goSeason(nextId) {
  const id = Number(nextId)
  closeSeasonSwitch()
  if (!Number.isFinite(id) || id === props.id) return
  router.push({ name: 'season', params: { mode: props.mode, id } })
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

        <div class="hero-total" :title="`${totalLabel} · ${fmtInt(stageStats.total)}`">
          <div class="hero-total-k">{{ totalLabel }}</div>
          <div class="hero-total-v">{{ fmtShort(stageStats.total) }}</div>
          <div class="hero-total-sub">{{ mode === 'peak' ? '仲裁项总HP' : '关卡总HP' }} · {{ fmtInt(stageStats.total) }}</div>
        </div>

        <div class="season-switch" @focusout="scheduleCloseSeasonSwitch" @focusin="cancelCloseSeasonSwitch" @mouseleave="closeSeasonSwitch">
          <div class="switch-label">切换赛季</div>
          <div class="switch-control">
            <button
              class="season-trigger"
              type="button"
              :aria-expanded="switchOpen"
              aria-haspopup="listbox"
              @click="toggleSeasonSwitch"
              @keydown.escape.stop="closeSeasonSwitch"
            >
              <span class="trigger-id">#{{ id }}</span>
              <span class="trigger-name">{{ currentSeasonOption?.zh || currentSeasonOption?.en || seasonTitle }}</span>
              <span class="select-caret" aria-hidden="true"></span>
            </button>

            <div v-if="switchOpen" class="season-menu" role="listbox" aria-label="选择赛季" @mouseenter="cancelCloseSeasonSwitch">
              <button
                v-for="season in seasonOptions"
                :key="season.id"
                class="season-option"
                type="button"
                role="option"
                :aria-selected="season.id === id"
                :data-active="season.id === id"
                @click="goSeason(season.id)"
              >
                <span class="option-mark" aria-hidden="true"></span>
                <span class="option-copy">
                  <span class="option-id">#{{ season.id }}</span>
                  <span class="option-name">{{ season.zh || season.en || season.id }}</span>
                </span>
              </button>
            </div>
          </div>
          <div class="switch-meta">
            {{ seasonOptions.length ? `共 ${seasonOptions.length} 期可切换` : '正在读取赛季列表' }}
          </div>
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

    <div v-else-if="data" :class="detailClass">
      <section class="detail-top">
        <div class="top-panels">
          <div v-if="showStageSelector" class="panel stage-panel">
            <div class="panel-title">{{ stagePanelTitle }}</div>
            <SegmentTabs :model-value="stageKey" :items="stageTabs" @update:model-value="v => (stageKey = v)" />
            <div class="panel-sub">{{ stagePanelSub }}</div>
          </div>

          <div v-if="hasTopEffects" class="effects-row">
            <EffectList v-if="data.effects?.length" :title="effectTitle" :items="data.effects" />
            <template v-if="mode === 'doom'">
              <EffectList v-if="data.nodeEffects?.side1?.length" title="节点 1 效果" :items="data.nodeEffects.side1" />
              <EffectList v-if="data.nodeEffects?.side2?.length" title="节点 2 效果" :items="data.nodeEffects.side2" />
              <EffectList v-if="data.nodeEffects?.side3?.length" title="星启模式效果" :items="data.nodeEffects.side3" />
            </template>
            <EffectList v-if="activeStage?.effects?.length" :title="stageEffectTitle" :items="activeStage.effects" />
          </div>
        </div>
      </section>

      <section class="main">
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
  overflow: visible;
  padding: 18px;
  border-radius: 24px;
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--surface-strong) 92%, transparent), color-mix(in oklab, var(--surface) 94%, transparent)),
    radial-gradient(100% 140% at 100% 80%, color-mix(in oklab, var(--acc) 16%, transparent) 0%, transparent 56%);
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

.hero-total {
  min-width: 180px;
  display: grid;
  gap: 6px;
  align-content: center;
  justify-self: stretch;
  padding: 14px 16px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--warn) 10%, var(--surface-soft)), color-mix(in oklab, var(--surface-strong) 88%, transparent));
  border: 1px solid color-mix(in oklab, var(--warn) 32%, var(--line));
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, white 6%, transparent),
    0 18px 42px color-mix(in oklab, var(--warn) 10%, transparent);
}

.hero-total-k {
  font-size: 12px;
  color: color-mix(in oklab, var(--muted) 92%, white);
}

.hero-total-v {
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1;
  font-weight: 840;
  color: color-mix(in oklab, var(--warn) 94%, white);
}

.hero-total-sub {
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in oklab, var(--muted) 90%, white);
}

.season-switch {
  position: relative;
  display: grid;
  gap: 8px;
  align-content: end;
  padding: 14px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--surface-soft) 76%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
}

.switch-label {
  font-size: 13px;
  font-weight: 760;
  color: var(--text);
}

.switch-control {
  position: relative;
}

.season-trigger {
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border-radius: 14px;
  padding: 9px 42px 9px 12px;
  background: color-mix(in oklab, var(--bg-1) 88%, transparent);
  border: 1px solid color-mix(in oklab, var(--line-strong) 34%, var(--line));
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.season-trigger:hover,
.season-trigger:focus-visible {
  border-color: color-mix(in oklab, var(--acc2) 50%, var(--line-strong));
  background: color-mix(in oklab, var(--surface-soft) 86%, transparent);
}

.season-trigger:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--acc2) 82%, white);
  outline-offset: 2px;
}

.trigger-id {
  color: color-mix(in oklab, var(--warn) 92%, white);
  font-weight: 820;
}

.trigger-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 760;
}

.select-caret {
  position: absolute;
  top: 50%;
  right: 15px;
  width: 10px;
  height: 10px;
  border-right: 2px solid color-mix(in oklab, var(--acc2) 78%, white);
  border-bottom: 2px solid color-mix(in oklab, var(--acc2) 78%, white);
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
  transition: transform 160ms ease;
}

.season-trigger[aria-expanded='true'] .select-caret {
  transform: translateY(-35%) rotate(225deg);
}

.season-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 8px);
  right: 0;
  width: min(420px, calc(100vw - 44px));
  max-height: 360px;
  overflow: auto;
  display: grid;
  gap: 6px;
  padding: 8px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface-strong) 96%, transparent), color-mix(in oklab, var(--surface) 96%, transparent));
  border: 1px solid color-mix(in oklab, var(--line-strong) 44%, var(--line));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
}

.season-option {
  min-height: 54px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 8px 10px;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.season-option:hover,
.season-option:focus-visible {
  border-color: color-mix(in oklab, var(--acc2) 34%, var(--line));
  background: color-mix(in oklab, var(--surface-soft) 72%, transparent);
  outline: none;
}

.season-option[data-active='true'] {
  border-color: color-mix(in oklab, var(--acc) 50%, var(--line));
  background: color-mix(in oklab, var(--acc) 11%, var(--surface-soft));
}

.option-mark {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--warn) 82%, white) 0 28%, transparent 29%),
    color-mix(in oklab, var(--line) 74%, var(--surface-soft));
  box-shadow: 0 0 0 5px color-mix(in oklab, var(--line) 22%, transparent);
}

.season-option[data-active='true'] .option-mark {
  background:
    radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--warn) 90%, white) 0 30%, transparent 31%),
    linear-gradient(180deg, color-mix(in oklab, var(--acc2) 82%, white), color-mix(in oklab, var(--acc) 86%, white));
}

.option-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.option-id {
  font-size: 12px;
  color: color-mix(in oklab, var(--muted) 90%, white);
}

.option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 760;
}

.switch-meta {
  min-height: 20px;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in oklab, var(--muted) 90%, white);
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

.grid,
.detail-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  align-items: start;
}

.detail-top {
  display: grid;
  gap: 14px;
  align-items: start;
}

.top-panels {
  display: grid;
  gap: 14px;
}

.effects-row {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
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
    grid-template-columns: minmax(0, 1fr) minmax(180px, 240px) minmax(260px, 340px);
    align-items: end;
  }
}

@media (min-width: 1040px) {
  .grid {
    grid-template-columns: 320px 1fr;
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

  .season-menu {
    left: 0;
    right: auto;
    width: 100%;
    max-height: 320px;
  }
}
</style>
