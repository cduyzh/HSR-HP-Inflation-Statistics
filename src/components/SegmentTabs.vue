<script setup>
const props = defineProps({
  modelValue: { type: String, required: true },
  items: { type: Array, required: true },
})

const emit = defineEmits(['update:modelValue'])

function pick(v) {
  emit('update:modelValue', v)
}
</script>

<template>
  <div class="seg" role="tablist" aria-label="筛选选项">
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
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 10px;
  padding: 6px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-0) 46%, var(--surface)), color-mix(in oklab, var(--bg-1) 72%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 72%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.seg-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 104px;
  height: 46px;
  border-radius: 7px;
  border: 1px solid color-mix(in oklab, var(--line) 48%, transparent);
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface-soft) 76%, transparent), color-mix(in oklab, var(--bg-1) 84%, transparent));
  color: color-mix(in oklab, var(--muted) 88%, white);
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
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
}

@media (max-width: 720px) {
  .seg {
    grid-auto-flow: row;
    grid-auto-columns: auto;
  }

  .seg-btn {
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
