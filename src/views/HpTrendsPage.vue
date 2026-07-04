<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EChartView from '../components/EChartView.vue'
import EffectList from '../components/EffectList.vue'
import SeasonRail from '../components/SeasonRail.vue'
import SegmentTabs from '../components/SegmentTabs.vue'
import StatCard from '../components/StatCard.vue'
import { getHsrVersions } from '../services/hsrStatic'
import { getSeasons, getTrend } from '../services/endgame'
import { fmtInt, fmtPct, fmtShort } from '../utils/format'

const props = defineProps({
  mode: { type: String, default: 'moc' },
})

const router = useRouter()

const ver = ref('')

const starFilter = ref('all')

const seasons = ref([])
const trend = ref([])
const selectedSeasonIds = ref([])

const loading = ref(false)
const error = ref('')
const progress = ref({ done: 0, total: 0 })

let ac = null

const modeLabel = computed(() => {
  const m = props.mode
  if (m === 'moc') return '忘却之庭'
  if (m === 'fiction') return '虚构叙事'
  if (m === 'doom') return '末日幻影'
  if (m === 'peak') return '异相仲裁'
  return m
})

const starTabs = [
  { value: 'all', label: '全部' },
  { value: 'star', label: '星启' },
  { value: 'nostar', label: '非星启' },
]

const showStarFilter = computed(() => props.mode !== 'peak')
const versionLabel = computed(() => (ver.value ? `local-cache · ${ver.value}` : 'local-cache'))
const selectedSeasonIdSet = computed(() => new Set(selectedSeasonIds.value))
const filteredTrend = computed(() => trend.value.filter(item => selectedSeasonIdSet.value.has(item.id)))
const emptyStateSub = computed(() => {
  if (trend.value.length && !filteredTrend.value.length) return '请选择至少 1 期，或使用右侧快捷按钮快速筛选。'
  return '尝试切换筛选项，或检查本地 local-cache 数据是否完整。'
})

function stopLoading() {
  ac?.abort()
  ac = null
}

async function ensureVersion() {
  if (ver.value) return
  const res = await getHsrVersions()
  ver.value = res.latest
}

function syncSelectedSeasonIds(nextSeasons) {
  const availableIds = nextSeasons.map(it => it.id)
  const nextSelected = selectedSeasonIds.value.filter(id => availableIds.includes(id))
  selectedSeasonIds.value = nextSelected.length ? nextSelected : availableIds
}

async function load() {
  stopLoading()
  ac = new AbortController()

  loading.value = true
  error.value = ''
  progress.value = { done: 0, total: 0 }

  try {
    await ensureVersion()
    const nextFilter = props.mode === 'peak' ? 'all' : starFilter.value
    const list = await getSeasons(props.mode, ver.value, { starFilter: nextFilter, signal: ac.signal })
    seasons.value = list
    syncSelectedSeasonIds(list)

    const t = await getTrend(props.mode, ver.value, list, {
      signal: ac.signal,
      onProgress(p) {
        progress.value = { done: p.done, total: p.total }
      },
    })
    trend.value = t
  } catch (e) {
    if (e?.name !== 'AbortError') error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.mode,
  mode => {
    if (mode === 'peak') starFilter.value = 'all'
  },
  { immediate: true },
)

watch(
  () => [props.mode, ver.value, starFilter.value],
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

function buildTooltip(params) {
  const point = Array.isArray(params) ? params[0] : params
  const item = filteredTrend.value[point?.dataIndex] || {}
  const lines = [item.label || point?.axisValueLabel || '']
  if (item.id) lines.push(`#${item.id}`)
  lines.push(`${point?.marker || ''}${point?.seriesName || '总HP'}：${fmtInt(point?.data)}`)
  return lines.join('<br/>')
}

const chartOption = computed(() => {
  const labels = filteredTrend.value.map(p => p.label || String(p.id))
  return {
    backgroundColor: 'transparent',
    grid: { left: 52, right: 26, top: 28, bottom: 36 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: 'rgba(10, 11, 16, 0.92)',
      borderColor: 'rgba(124, 92, 255, 0.35)',
      borderWidth: 1,
      textStyle: { color: '#e8ecff', fontSize: 12 },
      formatter: buildTooltip,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        color: 'rgba(152, 161, 198, 0.92)',
        rotate: labels.some(it => String(it).length > 8) ? 22 : 0,
        formatter: value => {
          const text = String(value)
          return text.length > 10 ? `${text.slice(0, 10)}…` : text
        },
      },
      axisLine: { lineStyle: { color: 'rgba(42, 47, 68, 0.9)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(152, 161, 198, 0.92)',
        formatter: v => fmtShort(v),
      },
      splitLine: { lineStyle: { color: 'rgba(42, 47, 68, 0.55)' } },
    },
    series: [
      {
        name: props.mode === 'peak' ? '整期总HP' : '最终关卡总HP',
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#20d3ff' },
        itemStyle: { color: '#20d3ff' },
        areaStyle: { color: 'rgba(32, 211, 255, 0.12)' },
        data: filteredTrend.value.map(p => p.total),
      },
    ],
  }
})

const stats = computed(() => {
  const series = filteredTrend.value.map(p => p.total)
  const count = series.length
  if (!count) {
    return {
      count: 0,
      max: 0,
      min: 0,
      avg: 0,
      first: 0,
      last: 0,
      grow: 0,
    }
  }
  const max = Math.max(...series)
  const min = Math.min(...series)
  const avg = series.reduce((a, b) => a + b, 0) / count
  const first = series[0]
  const last = series[count - 1]
  const grow = first ? (last - first) / first : 0
  return { count, max, min, avg, first, last, grow }
})

function goSeason(id) {
  router.push({ name: 'season', params: { mode: props.mode, id } })
}

function toggleSeasonSelection(id) {
  if (selectedSeasonIdSet.value.has(id)) {
    selectedSeasonIds.value = selectedSeasonIds.value.filter(it => it !== id)
    return
  }
  selectedSeasonIds.value = [...selectedSeasonIds.value, id]
}

function selectRecentSeasons(count) {
  selectedSeasonIds.value = seasons.value
    .slice()
    .sort((a, b) => a.id - b.id)
    .slice(-count)
    .map(it => it.id)
}

function selectAllSeasons() {
  selectedSeasonIds.value = seasons.value.map(it => it.id)
}
</script>

<template>
  <div class="layout">
    <section class="board">
      <div class="board-grid">
        <div class="chart-wrap">
          <div class="chart-hd">
            <div class="chip">
              <span class="chip-dot" aria-hidden="true"></span>
              <span class="chip-copy">
                <span class="chip-k">趋势面板</span>
                <span class="chip-v">{{ modeLabel }} · {{ mode === 'peak' ? '整期仲裁趋势' : '最终关卡趋势' }}</span>
              </span>
            </div>

            <div class="chart-tools">
              <div class="version-pill">{{ versionLabel }}</div>
              <div class="filters">
                <SegmentTabs
                  v-if="showStarFilter"
                  :model-value="starFilter"
                  :items="starTabs"
                  @update:model-value="v => (starFilter = v)"
                />
              </div>
            </div>
          </div>

          <div v-if="error" class="state bad">
            <div class="state-title">加载失败</div>
            <div class="state-sub">{{ error }}</div>
            <button class="btn" type="button" @click="load">重试</button>
          </div>

          <div v-else class="chart-body">
            <div v-if="loading" class="loading">
              <div class="bar">
                <div class="bar-fill" :style="{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }"></div>
              </div>
              <div class="loading-text">正在计算血量：{{ progress.done }}/{{ progress.total }}</div>
            </div>
            <EChartView v-if="filteredTrend.length" :option="chartOption" :height="340" />
            <div v-else-if="!loading" class="state">
              <div class="state-title">暂无数据</div>
              <div class="state-sub">{{ emptyStateSub }}</div>
            </div>
          </div>

          <div class="stats">
            <StatCard
              label="期数"
              :value="stats.count ? `${stats.count} 期` : '--'"
              :sub="`${showStarFilter ? (starFilter === 'all' ? '全部' : starFilter === 'star' ? '仅星启' : '非星启') : '无星启'} · ${versionLabel}`"
            />
            <StatCard label="最高血量" :value="stats.count ? fmtInt(stats.max) : '--'" tone="warn" :sub="mode === 'peak' ? '整期仲裁总血量最大值' : '最终关卡总血量最大值'" />
            <StatCard label="最低血量" :value="stats.count ? fmtInt(stats.min) : '--'" :sub="mode === 'peak' ? '整期仲裁总血量最小值' : '最终关卡总血量最小值'" />
            <StatCard label="平均血量" :value="stats.count ? fmtInt(stats.avg) : '--'" tone="good" :sub="mode === 'peak' ? '整期仲裁总血量均值' : '最终关卡总血量均值'" />
            <StatCard label="起点 -> 最新" :value="stats.count ? `${fmtShort(stats.first)} → ${fmtShort(stats.last)}` : '--'" :sub="mode === 'peak' ? '整期口径' : '最终关卡口径'" />
            <StatCard label="增长率" :value="stats.count ? fmtPct(stats.grow) : '--'" :sub="mode === 'peak' ? '整期口径' : '最终关卡口径'" :tone="stats.grow > 0.2 ? 'warn' : 'neutral'" />
          </div>
        </div>

        <aside class="side">
          <SeasonRail
            :items="seasons"
            :selected-ids="selectedSeasonIds"
            @toggle="toggleSeasonSelection"
            @select-recent="selectRecentSeasons"
            @select-all="selectAllSeasons"
            @open="goSeason"
          />
          <EffectList
            title="说明"
            :items="[
              { name: '统计口径', desc: mode === 'peak' ? '异相仲裁按整期仲裁项总 HP 汇总；不区分星启，也不按阶段切片。' : '每期只统计最终关卡的两路敌人总 HP；若存在额外轮次，也会计入最终关卡总量。' },
              { name: '阶段规则', desc: mode === 'moc' ? '忘却之庭：只统计最后一层。' : mode === 'fiction' ? '虚构叙事：只统计阶段 4。' : mode === 'doom' ? '末日幻影：只统计阶段 4，并补计同层额外轮次。' : '异相仲裁：单独按整期处理。' },
              { name: '缓存规则', desc: '当前页面只读取 public/local-cache 下的本地静态 JSON，不再触发远端刷新。' },
            ]"
          />
        </aside>
      </div>
    </section>
  </div>
</template>

<style scoped>
.layout {
  max-width: 1360px;
  margin: 0 auto;
  padding-top: clamp(12px, 1.8vw, 24px);
}

.board {
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface-strong) 94%, transparent), color-mix(in oklab, var(--surface) 96%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 64%, transparent);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.version-pill {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  padding: 10px 12px;
  background: color-mix(in oklab, var(--bg-1) 88%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  color: var(--text);
  font-size: 12px;
}

.btn {
  border-radius: 16px;
  padding: 10px 12px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--acc) 18%, var(--bg-1)), color-mix(in oklab, var(--acc2) 10%, var(--bg-1)));
  border: 1px solid color-mix(in oklab, var(--acc) 48%, var(--line));
  color: var(--text);
  cursor: pointer;
  transition: border-color 160ms ease, filter 160ms ease;
}

.btn:hover {
  filter: brightness(1.06);
  border-color: color-mix(in oklab, var(--acc2) 45%, var(--line));
}

.board-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 14px;
}

.chart-wrap {
  border-radius: 14px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface) 92%, transparent), color-mix(in oklab, var(--surface-soft) 92%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  padding: 14px;
}

.chart-hd {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  width: fit-content;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  background: color-mix(in oklab, var(--bg-2) 78%, transparent);
  color: color-mix(in oklab, var(--muted) 88%, white);
}

.chip-dot {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--warn) 88%, white) 0 28%, transparent 30%),
    linear-gradient(180deg, color-mix(in oklab, var(--acc2) 82%, white), color-mix(in oklab, var(--line-strong) 72%, transparent));
  box-shadow: 0 0 0 5px color-mix(in oklab, var(--acc) 14%, transparent);
}

.chip-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.chip-k {
  font-size: 11px;
  line-height: 1.2;
  color: var(--muted);
}

.chip-v {
  font-size: 14px;
  line-height: 1.25;
  font-weight: 760;
  color: var(--text);
  white-space: nowrap;
}

.chart-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.filters {
  display: grid;
  grid-auto-flow: column;
  gap: 10px;
}

.chart-body {
  margin-top: 12px;
}

.loading {
  padding: 12px 0 10px;
}

.bar {
  height: 10px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-2) 82%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, color-mix(in oklab, var(--acc) 88%, white), color-mix(in oklab, var(--acc2) 88%, white));
  box-shadow: 0 0 24px color-mix(in oklab, var(--acc2) 20%, transparent);
}

.loading-text {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}

.state {
  padding: 16px 12px;
  border-radius: 18px;
  border: 1px dashed color-mix(in oklab, var(--line) 72%, transparent);
  background: color-mix(in oklab, var(--bg-2) 74%, transparent);
}

.state.bad {
  border-color: color-mix(in oklab, var(--bad) 40%, var(--line));
}

.state-title {
  font-weight: 720;
}

.state-sub {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-line;
}

.stats {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.side {
  display: grid;
  gap: 12px;
}

@media (min-width: 1040px) {
  .board-grid {
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
  }

  .stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .chart-hd {
    grid-template-columns: 1fr;
  }

  .chart-tools {
    justify-content: stretch;
  }

  .version-pill,
  .filters {
    width: 100%;
  }

  .chip {
    width: 100%;
  }

  .chip-v {
    white-space: normal;
  }
}
</style>
