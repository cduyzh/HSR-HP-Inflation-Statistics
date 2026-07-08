<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['toggle', 'select-recent', 'select-all', 'open'])

function toggle(id) {
  emit('toggle', id)
}

function selectRecent(count) {
  emit('select-recent', count)
}

function selectAll() {
  emit('select-all')
}

function open(id) {
  emit('open', id)
}

const show = computed(() => props.items.slice().sort((a, b) => b.id - a.id))
const selectedSet = computed(() => new Set(props.selectedIds))
</script>

<template>
  <section class="rail" aria-label="期数筛选面板">
    <header class="rail-hd">
      <div class="rail-copy">
        <div class="rail-title">期数</div>
        <div class="rail-sub">已选 {{ selectedIds.length }} / {{ items.length }} 期</div>
      </div>

      <div class="rail-actions" role="group" aria-label="快捷筛选">
        <button class="rail-action" type="button" @click="selectRecent(3)">近 3 期</button>
        <button class="rail-action" type="button" @click="selectRecent(5)">近 5 期</button>
        <button class="rail-action" type="button" @click="selectAll">全选</button>
      </div>
    </header>

    <div class="rail-list" role="list">
      <article
        v-for="s in show"
        :key="s.id"
        class="season-card"
        :data-active="selectedSet.has(s.id)"
        role="listitem"
      >
        <button
          class="season-pick"
          type="button"
          :aria-pressed="selectedSet.has(s.id)"
          @click="toggle(s.id)"
        >
          <span class="season-mark" aria-hidden="true"></span>

          <span class="season-copy">
            <span class="season-id">#{{ s.id }}</span>
            <span class="season-name">{{ s.zh || s.en || s.id }}</span>
          </span>
        </button>

        <div class="season-footer">
          <button class="detail-btn" type="button" @click="open(s.id)">查看详情</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.rail {
  border-radius: 8px;
  padding: 16px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface-strong) 92%, transparent), color-mix(in oklab, var(--surface) 94%, transparent)),
    linear-gradient(135deg, color-mix(in oklab, var(--acc2) 5%, transparent), transparent 52%);
  border: 1px solid color-mix(in oklab, var(--line) 74%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.rail-hd {
  display: grid;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid color-mix(in oklab, var(--line) 76%, transparent);
}

.rail-copy {
  display: grid;
  gap: 4px;
}

.rail-title {
  font-size: 15px;
  font-weight: 760;
  color: var(--text);
}

.rail-sub {
  font-size: 13px;
  color: var(--muted);
}

.rail-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 6px;
  border-radius: 8px;
  background: color-mix(in oklab, var(--bg-0) 34%, var(--surface-soft));
  border: 1px solid color-mix(in oklab, var(--line) 62%, transparent);
}

.rail-action {
  min-height: 44px;
  border: 0;
  border-radius: 7px;
  padding: 0 10px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface-soft) 90%, white 2%), color-mix(in oklab, var(--surface) 88%, transparent));
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease, box-shadow 180ms ease;
}

.rail-action:hover,
.rail-action:focus-visible {
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--acc) 18%, var(--surface-soft)), color-mix(in oklab, var(--acc2) 10%, var(--surface)));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--acc) 38%, white);
  outline: none;
}

.rail-list {
  margin-top: 14px;
  display: grid;
  gap: 12px;
  max-height: 460px;
  overflow: auto;
  padding-right: 6px;
}

.rail-list::-webkit-scrollbar {
  width: 10px;
}

.rail-list::-webkit-scrollbar-track {
  background: color-mix(in oklab, var(--bg-0) 28%, transparent);
  border-radius: 999px;
}

.rail-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, color-mix(in oklab, var(--line-strong) 46%, transparent), color-mix(in oklab, var(--line) 90%, transparent));
  border-radius: 999px;
}

.season-card {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-1) 88%, transparent), color-mix(in oklab, var(--bg-2) 76%, transparent));
  border: 1px solid color-mix(in oklab, var(--line) 68%, transparent);
  overflow: hidden;
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}

.season-card::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: transparent;
  transition: background 180ms ease, box-shadow 180ms ease;
  pointer-events: none;
}

.season-card:hover {
  border-color: color-mix(in oklab, var(--acc2) 40%, var(--line));
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--acc2) 7%, var(--bg-1)), color-mix(in oklab, var(--bg-2) 80%, transparent));
  box-shadow: 0 12px 30px color-mix(in oklab, var(--bg-0) 26%, transparent);
}

.season-card[data-active='true'] {
  border-color: color-mix(in oklab, var(--acc) 54%, var(--line));
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--acc) 12%, var(--bg-1)), color-mix(in oklab, var(--acc2) 8%, var(--bg-2)));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--acc2) 12%, transparent);
}

.season-card[data-active='true']::after {
  background: linear-gradient(180deg, color-mix(in oklab, var(--warn) 90%, white), color-mix(in oklab, var(--acc2) 82%, white));
  box-shadow: 0 0 16px color-mix(in oklab, var(--acc) 30%, transparent);
}

.season-pick {
  min-height: 58px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.season-pick:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--acc2) 82%, white);
  outline-offset: 4px;
  border-radius: 6px;
}

.season-mark {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--warn) 82%, white) 0 30%, transparent 31%),
    color-mix(in oklab, var(--line) 78%, var(--surface-soft));
  box-shadow: 0 0 0 5px color-mix(in oklab, var(--line) 26%, transparent);
}

.season-card[data-active='true'] .season-mark {
  background:
    radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--warn) 90%, white) 0 32%, transparent 33%),
    linear-gradient(180deg, color-mix(in oklab, var(--acc2) 88%, white), color-mix(in oklab, var(--acc) 88%, white));
  box-shadow:
    0 0 0 5px color-mix(in oklab, var(--acc) 18%, transparent),
    0 0 18px color-mix(in oklab, var(--acc2) 20%, transparent);
}

.season-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.season-id {
  font-size: 13px;
  color: color-mix(in oklab, var(--muted) 92%, white);
}

.season-name {
  font-size: 16px;
  line-height: 1.2;
  font-weight: 760;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.season-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.detail-btn {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid color-mix(in oklab, var(--line-strong) 28%, var(--line));
  border-radius: 7px;
  background: color-mix(in oklab, var(--surface-soft) 86%, transparent);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
}

.detail-btn:hover,
.detail-btn:focus-visible {
  border-color: color-mix(in oklab, var(--acc2) 44%, white);
  background: color-mix(in oklab, var(--acc2) 12%, var(--surface-soft));
  outline: none;
}

@media (min-width: 1040px) {
  .rail-hd {
    grid-template-columns: minmax(180px, 1fr) minmax(320px, auto);
    align-items: end;
  }

  .rail-actions {
    min-width: 320px;
  }

  .rail-list {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
}

@media (max-width: 720px) {
  .rail {
    padding: 14px;
  }

  .rail-actions {
    grid-template-columns: 1fr;
  }

  .season-name {
    font-size: 16px;
    white-space: normal;
  }

  .season-footer {
    justify-content: stretch;
  }

  .detail-btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rail-action,
  .season-card,
  .detail-btn {
    transition: none;
  }
}
</style>
