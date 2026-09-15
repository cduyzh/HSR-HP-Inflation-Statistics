import { createRouter, createWebHistory } from 'vue-router'
import HpTrendsPage from '../views/HpTrendsPage.vue'
import SeasonDetailPage from '../views/SeasonDetailPage.vue'

const MODE_LABELS = {
  moc: '忘却之庭',
  fiction: '虚构叙事',
  doom: '末日幻影',
  peak: '异相仲裁',
}

const SITE_TITLE = '终局血量趋势'

export const routes = [
  { path: '/', redirect: '/trends/moc' },
  {
    path: '/trends/:mode',
    name: 'trends',
    component: HpTrendsPage,
    props: true,
  },
  {
    path: '/season/:mode/:id',
    name: 'season',
    component: SeasonDetailPage,
    props: route => ({ mode: route.params.mode, id: Number(route.params.id) }),
  },
  // 未知路径统一回默认趋势页，避免 RouterView 渲染空白页
  { path: '/:pathMatch(.*)*', redirect: '/trends/moc' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return false
  },
})

// 分享/多标签页场景下标题要能区分具体模式与期数
router.afterEach(to => {
  const modeLabel = MODE_LABELS[to.params?.mode] || ''
  if (to.name === 'trends' && modeLabel) {
    document.title = `${modeLabel}血量趋势 · ${SITE_TITLE}`
  } else if (to.name === 'season' && modeLabel && to.params?.id) {
    document.title = `${modeLabel} #${to.params.id} · ${SITE_TITLE}`
  } else {
    document.title = SITE_TITLE
  }
})
