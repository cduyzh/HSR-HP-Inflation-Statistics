<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  sub: { type: String, default: '' },
  tone: { type: String, default: 'neutral' },
})
</script>

<template>
  <div class="stat" :data-tone="tone">
    <div class="stat-hd">
      <div class="stat-label">{{ label }}</div>
    </div>
    <div class="stat-value">{{ value }}</div>
    <div v-if="sub" class="stat-sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.stat {
  padding: 14px 14px 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--bg-1) 92%, transparent), color-mix(in oklab, var(--bg-2) 80%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
}

.stat-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stat-label {
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--muted);
}

.stat-value {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 720;
  letter-spacing: 0.01em;
}

.stat-sub {
  margin-top: 6px;
  font-size: 12px;
  color: color-mix(in oklab, var(--muted) 88%, white);
}

.stat[data-tone='good'] .stat-value {
  color: color-mix(in oklab, var(--good) 90%, white);
}

.stat[data-tone='warn'] .stat-value {
  color: color-mix(in oklab, var(--warn) 95%, white);
}

.stat[data-tone='bad'] .stat-value {
  color: color-mix(in oklab, var(--bad) 90%, white);
}
</style>
