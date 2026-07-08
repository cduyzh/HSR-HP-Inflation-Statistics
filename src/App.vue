<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getHsrVersions } from './services/hsrStatic'

const route = useRoute()
const router = useRouter()

const mode = computed(() => {
  if (route.name === 'trends') return route.params.mode
  if (route.name === 'season') return route.params.mode
  return 'moc'
})

const tabs = [
  { key: 'moc', label: '忘却之庭' },
  { key: 'fiction', label: '虚构叙事' },
  { key: 'doom', label: '末日幻影' },
  { key: 'peak', label: '异相仲裁' },
]

const liveVersion = ref('4.3')
const activeSlideIndex = ref(0)
let slideTimer = null

onMounted(async () => {
  try {
    const versions = await getHsrVersions()
    liveVersion.value = versions.live || versions.latest || liveVersion.value
  } catch {
    // 保持默认展示值，避免顶部说明受请求失败影响
  }

  slideTimer = window.setInterval(() => {
    activeSlideIndex.value = (activeSlideIndex.value + 1) % heroSlides.length
  }, 5200)
})

onBeforeUnmount(() => {
  if (slideTimer) window.clearInterval(slideTimer)
})

const heroSlides = [
  {
    id: 'tide',
    title: '夏潮校准',
    note: '顶部横幅占位 · 后续可替换为轮播数据',
    image: '/banners/fiction-summer.png',
    position: 'center center',
    href: '',
  },
  {
    id: 'dusk',
    title: '深庭回声',
    note: '以赛季摘要、活动公告或版本重点做轮播卡',
    image: '/banners/fiction-summer.png',
    position: '18% 42%',
    href: '',
  },
  {
    id: 'aurora',
    title: '裁定公报',
    note: '当前为静态占位，已按移动端和横向轮播结构预留',
    image: '/banners/fiction-summer.png',
    position: '78% 34%',
    href: '',
  },
]

const activeSlide = computed(() => heroSlides[activeSlideIndex.value] || heroSlides[0])

function selectSlide(index) {
  activeSlideIndex.value = index
}

function goMode(nextMode) {
  if (nextMode === mode.value) return
  router.push({ name: 'trends', params: { mode: nextMode } })
}
</script>

<template>
  <div class="app-shell">
    <header class="hero-shell">
      <section class="hero-panel">
        <div class="hero-copy">
          <div class="brand-mark">
            <img class="brand-mark-icon" src="/favicon.png" alt="HSR" />
            <div class="brand-mark-copy">
              <div class="brand-mark-title">HSR Endgame Board</div>
              <div class="brand-mark-note">本地缓存驱动的终局血量看板</div>
            </div>
          </div>

          <div class="eyebrow">Honkai: Star Rail Endgame</div>
          <div class="brand-title">终局血量趋势</div>
          <div class="brand-sub">聚焦忘却之庭、虚构叙事、末日幻影与异相仲裁，用赛季总 HP、节点波次与怪物构成还原膨胀曲线。</div>

          <div class="hero-meta">
            <div class="meta-card">
              <span class="meta-k">当前模式</span>
              <span class="meta-v">{{ tabs.find(it => it.key === mode)?.label || '忘却之庭' }}</span>
            </div>
            <div class="meta-card">
              <span class="meta-k">当前版本</span>
              <span class="meta-v">{{ liveVersion }}</span>
            </div>
          </div>
        </div>

        <div class="hero-visual">
          <component
            :is="activeSlide.href ? 'a' : 'article'"
            class="hero-banner"
            :href="activeSlide.href || undefined"
            :style="{ '--banner-image': `url(${activeSlide.image})`, '--banner-position': activeSlide.position }"
            :aria-label="activeSlide.href ? `打开 ${activeSlide.title}` : undefined"
          >
            <div class="hero-banner-copy">
              <div class="hero-banner-k">Banner Carousel</div>
              <div class="hero-banner-v">{{ activeSlide.title }}</div>
              <p class="hero-banner-sub">{{ activeSlide.note }}</p>
            </div>
          </component>

          <div class="hero-dots" aria-label="顶部轮播切换">
            <button
              v-for="(slide, index) in heroSlides"
              :key="slide.id"
              type="button"
              class="hero-dot"
              :data-active="slide.id === activeSlide.id"
              :aria-label="`切换到${slide.title}`"
              @click="selectSlide(index)"
            >
              <span class="hero-dot-bar" aria-hidden="true"></span>
              <span class="hero-dot-text">{{ slide.title }}</span>
            </button>
          </div>
        </div>
      </section>

      <nav class="mode-tabs" aria-label="模式切换">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="mode-tab"
          :data-active="mode === t.key"
          type="button"
          @click="goMode(t.key)"
        >
          <span class="mode-pill"></span>
          <span class="mode-label">{{ t.label }}</span>
        </button>
      </nav>
    </header>

    <main class="main">
      <RouterView />
    </main>

    <footer class="footer">
      <span class="footer-muted">提示：首次加载会拉取并计算大量怪物数值，建议等缓存建立后再切换版本。</span>
    </footer>
  </div>
</template>

<style scoped>
:global(html) {
  overflow-anchor: none;
}

.app-shell {
  --mode-bar-offset: 76px;

  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding-top: var(--mode-bar-offset);
}

.hero-shell {
  position: relative;
  z-index: 5;
  padding: 14px 14px 10px;
  background: linear-gradient(180deg, rgba(7, 17, 29, 0.94), rgba(7, 17, 29, 0.82));
}

.hero-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 26px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface-strong) 94%, transparent), color-mix(in oklab, var(--surface) 96%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  box-shadow: var(--shadow-soft);
  transform-origin: top center;
}

.hero-copy {
  display: grid;
  gap: 12px;
}

.brand-mark {
  display: flex;
  gap: 12px;
  align-items: center;
}

.brand-mark-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  object-fit: cover;
  box-shadow: 0 16px 34px rgba(7, 10, 22, 0.34);
}

.brand-mark-copy {
  display: grid;
  gap: 4px;
}

.brand-mark-title {
  font-size: 15px;
  font-weight: 720;
  letter-spacing: 0.02em;
}

.brand-mark-note {
  font-size: 12px;
  color: color-mix(in oklab, var(--muted) 90%, white);
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.brand-title {
  font-size: clamp(30px, 4.2vw, 48px);
  line-height: 0.98;
  letter-spacing: 0.01em;
  font-weight: 760;
  font-family: 'Avenir Next', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.brand-sub {
  max-width: 58ch;
  font-size: 14px;
  line-height: 1.62;
  color: color-mix(in oklab, var(--muted) 88%, white);
}

.hero-meta {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.meta-card {
  min-height: 66px;
  display: grid;
  gap: 8px;
  align-content: center;
  padding: 12px 14px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--surface-soft) 88%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
}

.meta-k {
  font-size: 12px;
  color: var(--muted);
}

.meta-v {
  font-size: 15px;
  font-weight: 650;
}

.hero-visual {
  display: grid;
  gap: 10px;
}

.hero-banner {
  position: relative;
  display: block;
  min-height: 220px;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid color-mix(in oklab, var(--line) 76%, transparent);
  background:
    linear-gradient(120deg, rgba(7, 14, 24, 0.08), rgba(7, 14, 24, 0.64)),
    radial-gradient(140% 140% at 10% 0%, rgba(255, 255, 255, 0.18), transparent 46%),
    var(--banner-image) var(--banner-position) / cover no-repeat;
  text-decoration: none;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.hero-banner[href] {
  cursor: pointer;
}

.hero-banner[href]:hover,
.hero-banner[href]:focus-visible {
  border-color: color-mix(in oklab, var(--acc2) 58%, var(--line-strong));
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.22);
  outline: none;
}

.hero-banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8, 13, 22, 0.04), rgba(8, 13, 22, 0.68));
}

.hero-banner-copy {
  position: relative;
  z-index: 1;
  max-width: 420px;
  padding: 18px;
}

.hero-banner-k {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(245, 248, 255, 0.86);
}

.hero-banner-v {
  margin-top: 8px;
  font-size: clamp(22px, 2.5vw, 30px);
  line-height: 1.08;
  font-weight: 760;
}

.hero-banner-sub {
  margin: 8px 0 0;
  line-height: 1.6;
  color: rgba(238, 243, 255, 0.86);
}

.hero-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-dot {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
  background: color-mix(in oklab, var(--surface-soft) 84%, transparent);
  color: color-mix(in oklab, var(--muted) 92%, white);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
}

.hero-dot[data-active='true'] {
  color: var(--text);
  border-color: color-mix(in oklab, var(--acc) 50%, var(--line));
  background: color-mix(in oklab, var(--acc) 12%, var(--surface-soft));
}

.hero-dot:hover,
.hero-dot:focus-visible {
  border-color: color-mix(in oklab, var(--acc2) 44%, var(--line));
  outline: none;
}

.hero-dot-bar {
  width: 18px;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--line-strong) 62%, transparent);
}

.hero-dot[data-active='true'] .hero-dot-bar {
  background: linear-gradient(90deg, color-mix(in oklab, var(--acc) 86%, white), color-mix(in oklab, var(--acc2) 82%, white));
}

.mode-tabs {
  position: fixed;
  top: 10px;
  left: 50%;
  z-index: 30;
  width: min(1360px, calc(100vw - 28px));
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(12, 24, 38, 0.94), rgba(8, 17, 28, 0.9)),
    radial-gradient(120% 160% at 8% 0%, color-mix(in oklab, var(--acc2) 14%, transparent), transparent 46%);
  border: 1px solid color-mix(in oklab, var(--line-strong) 58%, transparent);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
}

.mode-tab {
  text-align: left;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 8px 12px;
  border-radius: 14px;
  background: color-mix(in oklab, var(--surface-soft) 92%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
  cursor: pointer;
}

.mode-tab[data-active='true'] {
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface) 96%, var(--acc) 10%), color-mix(in oklab, var(--surface-soft) 92%, var(--acc2) 10%));
  border-color: color-mix(in oklab, var(--line-strong) 64%, var(--acc));
  box-shadow: 0 18px 42px color-mix(in oklab, var(--acc) 12%, transparent);
}

.mode-tab:hover {
  border-color: color-mix(in oklab, var(--acc) 42%, var(--line));
}

.mode-pill {
  width: 8px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--acc) 86%, white), color-mix(in oklab, var(--acc2) 82%, white));
  opacity: 0.55;
}

.mode-tab[data-active='true'] .mode-pill {
  opacity: 0.95;
}

.mode-label {
  font-size: 13px;
  color: var(--text);
  font-weight: 680;
  white-space: nowrap;
}

.main {
  padding: 10px 14px 18px;
  transition: padding 220ms ease;
}

.footer {
  padding: 14px;
  color: var(--muted);
  font-size: 12px;
  border-top: 1px solid color-mix(in oklab, var(--line) 54%, transparent);
  background: transparent;
}

.footer-muted {
  display: inline-block;
  max-width: 72ch;
  line-height: 1.5;
}

@media (min-width: 980px) {
  .hero-shell {
    padding: 16px 18px 12px;
  }

  .hero-panel {
    grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
    align-items: stretch;
    max-height: 430px;
  }

  .main {
    padding: 12px 18px 22px;
  }
}

@media (max-width: 860px) {
  .app-shell {
    --mode-bar-offset: 128px;
  }

  .hero-dots {
    display: none;
  }

  .mode-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .app-shell {
    --mode-bar-offset: 120px;
  }

  .hero-shell {
    padding: 10px 10px 8px;
  }

  .hero-panel {
    padding: 14px;
    border-radius: 20px;
  }

  .hero-banner {
    min-height: 174px;
  }

  .brand-sub {
    font-size: 14px;
  }

  .main {
    padding: 8px 10px 16px;
  }

  .footer {
    padding: 12px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mode-tabs,
  .main {
    transition: none;
  }
}
</style>
