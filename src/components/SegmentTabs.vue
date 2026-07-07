<script setup>
const props = defineProps({
  modelValue: { type: String, required: true },
  items: { type: Array, required: true },
  layout: { type: String, default: 'rail' },
})

const emit = defineEmits(['update:modelValue'])

function pick(v) {
  emit('update:modelValue', v)
}
</script>

<template>
  <div class="seg" :data-layout="layout" role="tablist" aria-label="筛选选项">
    <button
      v-for="it in items"
      :key="it.value"
      class="seg-btn"
      type="button"
      role="tab"
      :aria-selected="modelValue === it.value"
      :data-active="modelValue === it.value"
      @click="pick(it.value)"
    >
      <span class="seg-mark" aria-hidden="true"></span>
      <span class="seg-label">{{ it.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: flex;
  gap: 10px;
  padding: 6px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-0) 46%, var(--surface)), color-mix(in oklab, var(--bg-1) 72%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.seg[data-layout='rail'] {
  flex-wrap: nowrap;
  align-items: stretch;
}

.seg::-webkit-scrollbar {
  display: none;
}

.seg[data-layout='fill'] {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  overflow: hidden;
}

.seg-btn {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: clamp(148px, 18vw, 224px);
  max-width: min(280px, 72vw);
  height: 46px;
  padding: 0 18px;
  border-radius: 7px;
  border: 1px solid color-mix(in oklab, var(--line) 48%, transparent);
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface-soft) 76%, transparent), color-mix(in oklab, var(--bg-1) 84%, transparent));
  color: color-mix(in oklab, var(--muted) 88%, white);
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}

.seg[data-layout='fill'] .seg-btn {
  min-width: 0;
  max-width: none;
  width: 100%;
  padding: 0 14px;
}

.seg-btn:hover,
.seg-btn:focus-visible {
  color: var(--text);
  border-color: color-mix(in oklab, var(--acc2) 42%, var(--line));
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--acc2) 10%, var(--surface-soft)), color-mix(in oklab, var(--bg-1) 88%, transparent));
  box-shadow: 0 10px 24px color-mix(in oklab, var(--bg-0) 34%, transparent);
  outline: none;
}

.seg-btn[data-active='true'] {
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--acc) 14%, var(--surface-soft)), color-mix(in oklab, var(--acc2) 8%, var(--bg-1)));
  border-color: color-mix(in oklab, var(--acc) 52%, var(--line));
  color: var(--text);
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--acc) 18%, transparent),
    0 12px 28px color-mix(in oklab, var(--bg-0) 30%, transparent);
}

.seg-mark {
  width: 7px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--line-strong) 62%, transparent), color-mix(in oklab, var(--line) 78%, transparent));
  transition: background 180ms ease, box-shadow 180ms ease;
}

.seg-btn[data-active='true'] .seg-mark {
  background: linear-gradient(180deg, color-mix(in oklab, var(--warn) 92%, white), color-mix(in oklab, var(--acc2) 80%, white));
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--acc) 14%, transparent);
}

.seg-label {
  font-size: 13px;
  font-weight: 760;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 1040px) {
  .seg[data-layout='rail'] {
    flex-wrap: wrap;
    overflow: visible;
  }

  .seg[data-layout='rail'] .seg-btn {
    flex: 1 1 176px;
    min-width: 176px;
    max-width: none;
  }
}

@media (max-width: 720px) {
  .seg[data-layout='fill'] {
    grid-auto-flow: row;
    grid-auto-columns: auto;
  }

  .seg[data-layout='fill'] .seg-btn {
    width: 100%;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seg-btn,
  .seg-mark {
    transition: none;
  }
}
</style>
