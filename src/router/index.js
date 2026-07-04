import { createRouter, createWebHistory } from 'vue-router'
import HpTrendsPage from '../views/HpTrendsPage.vue'
import SeasonDetailPage from '../views/SeasonDetailPage.vue'

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
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return false
  },
})
