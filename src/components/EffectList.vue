<script setup>
defineProps({
  title: { type: String, default: '环境效果' },
  items: { type: Array, default: () => [] },
})
</script>

<template>
  <section class="fx">
    <header class="fx-hd">
      <div class="fx-title">{{ title }}</div>
    </header>
    <div v-if="items.length" class="fx-list">
      <div v-for="(it, idx) in items" :key="idx" class="fx-item">
        <div class="fx-name">{{ it.name }}</div>
        <div class="fx-desc">{{ it.desc }}</div>
      </div>
    </div>
    <div v-else class="fx-empty">暂无环境效果信息</div>
  </section>
</template>

<style scoped>
.fx {
  border-radius: 22px;
  padding: 16px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--bg-1) 86%, transparent), color-mix(in oklab, var(--bg-2) 82%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 74%, transparent);
}

.fx-hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.fx-title {
  font-size: 14px;
  font-weight: 720;
  letter-spacing: 0.01em;
}

.fx-list {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.fx-item {
  padding: 12px 12px 10px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--bg-2) 78%, transparent);
  border: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
}

.fx-name {
  font-size: 13px;
  font-weight: 680;
  color: color-mix(in oklab, var(--text) 92%, white);
}

.fx-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.55;
  color: color-mix(in oklab, var(--muted) 90%, white);
  white-space: pre-line;
}

.fx-empty {
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
}
</style>
