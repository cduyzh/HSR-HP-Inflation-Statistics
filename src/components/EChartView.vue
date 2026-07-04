<script setup>
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: Number, default: 320 },
})

const el = ref(null)
let chart = null
let ro = null

function mountChart() {
  if (!el.value) return
  chart = echarts.init(el.value, null, { renderer: 'canvas' })
  chart.setOption(props.option, { notMerge: true, lazyUpdate: true })

  ro = new ResizeObserver(() => {
    chart?.resize()
  })
  ro.observe(el.value)
}

onMounted(mountChart)

watch(
  () => props.option,
  next => {
    chart?.setOption(next, { notMerge: true, lazyUpdate: true })
  },
  { deep: true },
)

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="echart" :style="{ height: `${height}px` }" ref="el"></div>
</template>

<style scoped>
.echart {
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
}
</style>
