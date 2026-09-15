<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册：折线图 + 直角坐标系 + axis tooltip（TooltipComponent 自带 axisPointer）。
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: Number, default: 320 },
})

const emit = defineEmits(['click'])

const el = ref(null)
let chart = null
let ro = null

function mountChart() {
  if (!el.value) return
  chart = echarts.init(el.value, null, { renderer: 'canvas' })
  chart.setOption(props.option, { notMerge: true, lazyUpdate: true })
  chart.on('click', params => emit('click', params))

  ro = new ResizeObserver(() => {
    chart?.resize()
  })
  ro.observe(el.value)
}

onMounted(mountChart)

// option 是整体替换的 computed（每次都是新对象），无需 deep 遍历大数组。
watch(
  () => props.option,
  next => {
    chart?.setOption(next, { notMerge: true, lazyUpdate: true })
  },
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
