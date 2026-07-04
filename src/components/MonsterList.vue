<script setup>
import { computed } from 'vue'

const props = defineProps({
  stage: { type: Object, default: null },
})

const base = computed(() => 'https://static.nanoka.cc/')
const elementMap = {
  physical: 'physical',
  fire: 'fire',
  ice: 'ice',
  thunder: 'thunder',
  wind: 'wind',
  quantum: 'quantum',
  imaginary: 'imaginary',
}

const groups = computed(() => props.stage?.groups || [])

function iconUrl(p) {
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  const path = String(p).replace(/^\/+/, '')
  return `${base.value}${path}`
}

function handleImageError(event) {
  const fallback = iconUrl('assets/hsr/monstermiddleicon/Monster_Unknown.webp')
  if (event?.target && event.target.src !== fallback) event.target.src = fallback
}

function elementIcon(type) {
  const key = String(type || '').toLowerCase()
  const name = elementMap[key]
  return name ? `${base.value}assets/hsr/element/${name}.webp` : ''
}

function totalHp(item) {
  const count = Number(item?.count) || 1
  const unitHp = Number(item?.unitHp) || 0
  const hpMultiplier = Number(item?.hpMultiplier) || 1
  return Math.round(unitHp * hpMultiplier * count)
}

function totalMultiplier(item) {
  const count = Number(item?.count) || 1
  const hpMultiplier = Number(item?.hpMultiplier) || 1
  return count * hpMultiplier
}
</script>

<template>
  <div class="board">
    <article v-for="group in groups" :key="group.key" class="node">
      <header class="node-hd">
        <div class="node-k">节点</div>
        <div class="node-v">{{ group.name }}</div>
        <div class="node-sub">{{ group.waves?.length || 0 }} 波 · {{ group.sideHp?.toLocaleString('en-US') }} HP</div>
      </header>

      <section v-for="wave in group.waves" :key="`${group.key}-${wave.stageId}-${wave.waveIndex}`" class="wave">
        <div class="wave-hd">
          <div class="wave-k">波次 {{ wave.waveIndex }}</div>
          <div class="wave-v">#{{ wave.stageId }} · Elite {{ wave.eliteGroup }}</div>
        </div>

        <div class="cards">
          <article v-for="m in wave.monsters" :key="`${wave.stageId}-${wave.waveIndex}-${m.id}`" class="card">
            <div class="media">
              <div class="frame">
                <img v-if="m.icon" class="img" :src="iconUrl(m.icon)" :alt="m.name" loading="lazy" @error="handleImageError" />
                <div v-else class="img ph" aria-hidden="true"></div>
              </div>

              <div class="meta">
                <div class="name" :title="m.name">{{ m.name }}</div>
                <div class="sub">
                  <span class="pill">#{{ m.id }}</span>
                  <span v-if="m.level" class="pill">Lv. {{ m.level }}</span>
                  <span v-if="m.count > 1" class="pill">数量 x{{ m.count }}</span>
                  <span v-if="m.hpMultiplier > 1" class="pill accent">HP x{{ m.hpMultiplier }}</span>
                </div>
              </div>
            </div>

            <div class="attrs">
              <div v-if="m.weak?.length" class="elements">
                <span class="attrs-k">弱点</span>
                <span class="element-list">
                  <img
                    v-for="type in m.weak"
                    :key="`${m.id}-weak-${type}`"
                    class="el-icon"
                    :src="elementIcon(type)"
                    :alt="type"
                    :title="type"
                    loading="lazy"
                  />
                </span>
              </div>

              <div v-if="m.resist?.length" class="resist">抗性：{{ m.resist.join(' / ') }}</div>
            </div>

            <div class="rows">
              <div class="row">
                <span class="k">单体HP</span>
                <span class="v">{{ m.unitHp?.toLocaleString('en-US') }}</span>
              </div>
              <div class="row">
                <span class="k">速度 SPD</span>
                <span class="v">{{ m.spd?.toLocaleString('en-US') ?? '-' }}</span>
              </div>
              <div class="row">
                <span class="k">总HP</span>
                <span class="v">
                  {{ totalHp(m).toLocaleString('en-US') }}
                  <template v-if="totalMultiplier(m) > 1">（{{ m.unitHp?.toLocaleString('en-US') }} × {{ totalMultiplier(m) }}）</template>
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </article>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.node {
  border-radius: 24px;
  padding: 18px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface-strong) 92%, transparent), color-mix(in oklab, var(--surface) 94%, transparent)),
    radial-gradient(140% 140% at 100% 0%, color-mix(in oklab, var(--acc2) 10%, transparent) 0%, transparent 55%);
  border: 1px solid color-mix(in oklab, var(--line-strong) 58%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--line) 24%, transparent);
}

.node-hd {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.node-k {
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.node-v {
  font-size: 18px;
  font-weight: 760;
}

.node-sub {
  font-size: 12px;
  color: color-mix(in oklab, var(--muted) 90%, white);
}

.wave + .wave {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid color-mix(in oklab, var(--line) 42%, transparent);
}

.wave-hd {
  display: grid;
  gap: 4px;
  margin-bottom: 12px;
}

.wave-k {
  font-size: 15px;
  font-weight: 720;
}

.wave-v {
  font-size: 12px;
  color: var(--muted);
}

.cards {
  display: grid;
  gap: 12px;
}

.card {
  padding: 14px 12px 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface-soft) 96%, transparent), color-mix(in oklab, var(--surface-strong) 90%, transparent));
  border: 1px solid color-mix(in oklab, var(--line-strong) 66%, var(--acc));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--acc) 10%, transparent);
}

.media {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 12px;
  align-items: start;
}

.frame {
  width: 80px;
  height: 80px;
  border-radius: 14px;
  background: radial-gradient(120% 120% at 20% 0%, color-mix(in oklab, var(--acc2) 26%, transparent), transparent 60%), color-mix(in oklab, var(--surface-strong) 92%, transparent);
  border: 1px solid color-mix(in oklab, var(--line-strong) 56%, var(--acc));
  overflow: hidden;
  display: grid;
  place-items: center;
}

.img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ph {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, color-mix(in oklab, var(--acc) 18%, transparent), color-mix(in oklab, var(--acc2) 22%, transparent));
}

.name {
  font-size: 15px;
  font-weight: 720;
  letter-spacing: 0.01em;
  line-height: 1.35;
}

.sub {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  font-size: 11px;
  color: color-mix(in oklab, var(--muted) 88%, white);
  border: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
  background: color-mix(in oklab, var(--surface-strong) 84%, transparent);
  padding: 3px 8px;
  border-radius: 999px;
}

.pill.accent {
  color: color-mix(in oklab, var(--acc2) 74%, white);
  border-color: color-mix(in oklab, var(--acc2) 34%, transparent);
  background: color-mix(in oklab, var(--acc2) 10%, transparent);
}

.attrs {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.elements {
  display: flex;
  align-items: center;
  gap: 10px;
}

.attrs-k {
  font-size: 12px;
  color: var(--muted);
}

.element-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.el-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.resist {
  font-size: 12px;
  color: color-mix(in oklab, var(--muted) 86%, white);
  line-height: 1.5;
}

.rows {
  margin-top: 10px;
  display: grid;
  gap: 6px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.k {
  color: var(--muted);
}

.v {
  font-weight: 650;
  line-height: 1.45;
}
</style>
