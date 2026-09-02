<script setup>
  import { nextTick, onBeforeUnmount, ref, watch } from "vue";
  import { APP_VERSION, CHANGELOG } from "../data/changelog";

  const props = defineProps({
    open: { type: Boolean, default: false },
  });

  const emit = defineEmits(["close"]);

  const TYPE_META = {
    feature: { label: "功能", className: "is-feature" },
    improve: { label: "优化", className: "is-improve" },
    fix: { label: "修复", className: "is-fix" },
    docs: { label: "文档", className: "is-docs" },
  };

  const closeBtn = ref(null);

  function typeMeta(type) {
    return TYPE_META[type] || { label: "更新", className: "is-improve" };
  }

  function onKeydown(event) {
    if (event.key === "Escape") emit("close");
  }

  let prevOverflow = "";
  let prevPaddingRight = "";

  function lockBodyScroll() {
    prevOverflow = document.body.style.overflow;
    prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeydown);
  }

  function unlockBodyScroll() {
    document.body.style.overflow = prevOverflow;
    document.body.style.paddingRight = prevPaddingRight;
    window.removeEventListener("keydown", onKeydown);
  }

  watch(
    () => props.open,
    (open) => {
      if (open) {
        lockBodyScroll();
        nextTick(() => closeBtn.value?.focus());
      } else {
        unlockBodyScroll();
      }
    },
  );

  onBeforeUnmount(() => {
    if (props.open) unlockBodyScroll();
  });
</script>

<template>
  <Transition name="changelog-fade">
    <div
      v-if="open"
      class="changelog-mask"
      @click.self="emit('close')">
      <section
        class="changelog-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="站点更新记录">
        <header class="changelog-head">
          <div class="changelog-heading">
            <h2 class="changelog-title">更新记录</h2>
            <span class="changelog-current">站点 v{{ APP_VERSION }}</span>
          </div>
          <button
            ref="closeBtn"
            class="changelog-close"
            type="button"
            aria-label="关闭更新记录"
            @click="emit('close')">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </header>

        <ol class="changelog-list">
          <li
            v-for="(entry, index) in CHANGELOG"
            :key="entry.version"
            class="changelog-item"
            :data-latest="index === 0">
            <div
              class="changelog-rail"
              aria-hidden="true">
              <span class="changelog-dot"></span>
            </div>

            <div class="changelog-body">
              <div class="changelog-meta">
                <span class="changelog-ver">v{{ entry.version }}</span>
                <span class="changelog-date">{{ entry.date }}</span>
                <span
                  v-if="index === 0"
                  class="changelog-latest">当前版本</span>
              </div>

              <h3 class="changelog-entry-title">{{ entry.title }}</h3>

              <ul class="changelog-changes">
                <li
                  v-for="(item, itemIndex) in entry.items"
                  :key="itemIndex"
                  class="changelog-change">
                  <span
                    class="changelog-tag"
                    :class="typeMeta(item.type).className">{{
                      typeMeta(item.type).label
                    }}</span>
                  <span class="changelog-text">{{ item.text }}</span>
                </li>
              </ul>
            </div>
          </li>
        </ol>

        <footer class="changelog-foot">
          数据版本与站点版本相互独立；数据版本见顶部“当前版本”。
        </footer>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
  .changelog-mask {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(4, 10, 18, 0.62);
    backdrop-filter: blur(8px);
  }

  .changelog-dialog {
    display: flex;
    flex-direction: column;
    width: min(640px, 100%);
    max-height: min(82vh, 760px);
    overflow: hidden;
    border-radius: 24px;
    background: linear-gradient(
      180deg,
      color-mix(in oklab, var(--surface-strong) 96%, transparent),
      color-mix(in oklab, var(--surface) 96%, transparent)
    );
    border: 1px solid color-mix(in oklab, var(--line-strong) 52%, transparent);
    box-shadow: 0 32px 80px rgba(2, 8, 16, 0.5);
  }

  .changelog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 12px;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 56%, transparent);
  }

  .changelog-heading {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }

  .changelog-title {
    margin: 0;
    font-size: 17px;
    font-weight: 720;
    letter-spacing: 0.01em;
  }

  .changelog-current {
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, var(--acc) 46%, transparent);
    background: color-mix(in oklab, var(--acc) 10%, transparent);
    color: var(--acc);
    font-size: 12px;
    font-weight: 680;
    white-space: nowrap;
  }

  .changelog-close {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 12px;
    border: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
    background: color-mix(in oklab, var(--surface-soft) 90%, transparent);
    color: var(--muted);
    cursor: pointer;
    transition:
      color 160ms ease,
      border-color 160ms ease;
  }

  .changelog-close:hover,
  .changelog-close:focus-visible {
    color: var(--text);
    border-color: color-mix(in oklab, var(--acc2) 50%, var(--line));
    outline: none;
  }

  .changelog-close svg {
    width: 16px;
    height: 16px;
  }

  .changelog-list {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 14px 18px 6px;
    list-style: none;
    overflow-y: auto;
  }

  .changelog-item {
    position: relative;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    gap: 12px;
    padding-bottom: 18px;
  }

  .changelog-item:last-child {
    padding-bottom: 10px;
  }

  .changelog-rail {
    position: relative;
    display: grid;
    justify-items: center;
  }

  .changelog-rail::before {
    content: "";
    position: absolute;
    top: 16px;
    bottom: -4px;
    width: 2px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--line) 62%, transparent);
  }

  .changelog-item:last-child .changelog-rail::before {
    display: none;
  }

  .changelog-dot {
    position: relative;
    z-index: 1;
    width: 12px;
    height: 12px;
    margin-top: 5px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--line-strong) 70%, transparent);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--surface-strong) 88%, transparent);
  }

  .changelog-item[data-latest="true"] .changelog-dot {
    background: linear-gradient(135deg, var(--acc), var(--acc2));
    box-shadow:
      0 0 0 3px color-mix(in oklab, var(--surface-strong) 88%, transparent),
      0 0 16px color-mix(in oklab, var(--acc) 46%, transparent);
  }

  .changelog-body {
    min-width: 0;
  }

  .changelog-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .changelog-ver {
    font-size: 15px;
    font-weight: 720;
    color: var(--text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .changelog-date {
    font-size: 12px;
    color: var(--muted);
  }

  .changelog-latest {
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, var(--acc) 46%, transparent);
    background: color-mix(in oklab, var(--acc) 10%, transparent);
    color: var(--acc);
    font-size: 11px;
    font-weight: 700;
  }

  .changelog-entry-title {
    margin: 6px 0 8px;
    font-size: 14px;
    font-weight: 680;
    color: color-mix(in oklab, var(--text) 94%, transparent);
  }

  .changelog-changes {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .changelog-change {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .changelog-tag {
    flex-shrink: 0;
    min-width: 38px;
    text-align: center;
    padding: 2px 8px;
    margin-top: 1px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.5;
  }

  .changelog-tag.is-feature {
    color: var(--acc);
    border: 1px solid color-mix(in oklab, var(--acc) 46%, transparent);
    background: color-mix(in oklab, var(--acc) 10%, transparent);
  }

  .changelog-tag.is-improve {
    color: var(--acc2);
    border: 1px solid color-mix(in oklab, var(--acc2) 46%, transparent);
    background: color-mix(in oklab, var(--acc2) 10%, transparent);
  }

  .changelog-tag.is-fix {
    color: var(--good);
    border: 1px solid color-mix(in oklab, var(--good) 44%, transparent);
    background: color-mix(in oklab, var(--good) 10%, transparent);
  }

  .changelog-tag.is-docs {
    color: var(--muted);
    border: 1px solid color-mix(in oklab, var(--line) 74%, transparent);
    background: color-mix(in oklab, var(--surface-soft) 86%, transparent);
  }

  .changelog-text {
    font-size: 13px;
    line-height: 1.6;
    color: color-mix(in oklab, var(--text) 88%, var(--muted));
  }

  .changelog-foot {
    padding: 10px 18px 14px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid color-mix(in oklab, var(--line) 56%, transparent);
  }

  .changelog-fade-enter-active,
  .changelog-fade-leave-active {
    transition: opacity 180ms ease;
  }

  .changelog-fade-enter-active .changelog-dialog,
  .changelog-fade-leave-active .changelog-dialog {
    transition:
      transform 180ms ease,
      opacity 180ms ease;
  }

  .changelog-fade-enter-from,
  .changelog-fade-leave-to {
    opacity: 0;
  }

  .changelog-fade-enter-from .changelog-dialog,
  .changelog-fade-leave-to .changelog-dialog {
    transform: translateY(10px) scale(0.985);
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .changelog-fade-enter-active,
    .changelog-fade-leave-active,
    .changelog-fade-enter-active .changelog-dialog,
    .changelog-fade-leave-active .changelog-dialog {
      transition: none;
    }
  }

  @media (max-width: 560px) {
    .changelog-mask {
      padding: 10px;
    }

    .changelog-dialog {
      border-radius: 18px;
    }

    .changelog-head,
    .changelog-list,
    .changelog-foot {
      padding-left: 14px;
      padding-right: 14px;
    }
  }
</style>
