<script setup>
  import { nextTick, onBeforeUnmount, ref, watch } from "vue";

  const props = defineProps({
    open: { type: Boolean, default: false },
  });

  const emit = defineEmits(["close"]);

  const WECHAT_ID = "cduyzh";
  const EMAIL = "cduyzh@gmail.com";

  const CONTACT = [
    {
      key: "wechat",
      label: "微信",
      value: WECHAT_ID,
      hint: "复制后打开微信 → 搜索该微信号 → 添加到通讯录",
      copy: "复制微信号",
    },
    {
      key: "email",
      label: "邮箱",
      value: EMAIL,
      hint: "点击「发邮件」直接撰写，或复制地址后自行粘贴",
      copy: "复制邮箱",
      href: `mailto:${EMAIL}?subject=${encodeURIComponent(
        "关于 HSR 终局血量看板的反馈",
      )}`,
    },
  ];

  const closeBtn = ref(null);
  const copiedKey = ref("");
  let copiedTimer = null;

  async function copyContact(item) {
    try {
      await navigator.clipboard.writeText(item.value);
    } catch {
      // 剪贴板不可用时静默失败，文本本身可长按选中
      return;
    }
    copiedKey.value = item.key;
    if (copiedTimer) window.clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => {
      copiedKey.value = "";
    }, 1800);
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
        copiedKey.value = "";
      }
    },
  );

  onBeforeUnmount(() => {
    if (copiedTimer) window.clearTimeout(copiedTimer);
    if (props.open) unlockBodyScroll();
  });
</script>

<template>
  <Transition name="contact-fade">
    <div
      v-if="open"
      class="contact-mask"
      @click.self="emit('close')">
      <section
        class="contact-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="联系方式">
        <header class="contact-head">
          <div class="contact-heading">
            <h2 class="contact-title">联系我</h2>
            <span class="contact-scope">仅两种方式</span>
          </div>
          <button
            ref="closeBtn"
            class="contact-close"
            type="button"
            aria-label="关闭联系方式"
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

        <ul class="contact-list">
          <li
            v-for="item in CONTACT"
            :key="item.key"
            class="contact-item">
            <div class="contact-item-head">
              <span class="contact-kind">{{ item.label }}</span>
              <span class="contact-hint">{{ item.hint }}</span>
            </div>

            <div class="contact-row">
              <span class="contact-value">{{ item.value }}</span>
              <div class="contact-actions">
                <button
                  class="contact-copy"
                  :data-copied="copiedKey === item.key"
                  type="button"
                  :aria-label="item.copy"
                  @click="copyContact(item)">
                  {{ copiedKey === item.key ? "已复制" : "复制" }}
                </button>
                <a
                  v-if="item.href"
                  class="contact-mail"
                  :href="item.href"
                  >发邮件</a
                >
              </div>
            </div>
          </li>
        </ul>

        <footer class="contact-foot">
          本站仅此两种联系渠道，不设留言板，也不收集任何表单内容。
        </footer>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
  .contact-mask {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(4, 10, 18, 0.62);
    backdrop-filter: blur(8px);
  }

  .contact-dialog {
    display: flex;
    flex-direction: column;
    width: min(520px, 100%);
    max-height: min(82vh, 620px);
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

  .contact-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 12px;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 56%, transparent);
  }

  .contact-heading {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }

  .contact-title {
    margin: 0;
    font-size: 17px;
    font-weight: 720;
    letter-spacing: 0.01em;
  }

  .contact-scope {
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, var(--acc) 46%, transparent);
    background: color-mix(in oklab, var(--acc) 10%, transparent);
    color: var(--acc);
    font-size: 12px;
    font-weight: 680;
    white-space: nowrap;
  }

  .contact-close {
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

  .contact-close:hover,
  .contact-close:focus-visible {
    color: var(--text);
    border-color: color-mix(in oklab, var(--acc2) 50%, var(--line));
    outline: none;
  }

  .contact-close svg {
    width: 16px;
    height: 16px;
  }

  .contact-list {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 16px 18px 6px;
    list-style: none;
    overflow-y: auto;
  }

  .contact-item {
    display: grid;
    gap: 10px;
    padding: 14px;
    border-radius: 18px;
    background: color-mix(in oklab, var(--surface-soft) 88%, transparent);
    border: 1px solid color-mix(in oklab, var(--line) 66%, transparent);
  }

  .contact-item-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .contact-kind {
    font-size: 13px;
    font-weight: 720;
    color: var(--text);
  }

  .contact-hint {
    flex: 1 1 180px;
    min-width: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
  }

  .contact-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .contact-value {
    min-width: 0;
    font-size: 16px;
    font-weight: 680;
    letter-spacing: 0.01em;
    color: color-mix(in oklab, var(--text) 94%, transparent);
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    overflow-wrap: anywhere;
    user-select: all;
  }

  .contact-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .contact-copy,
  .contact-mail {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 680;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition:
      color 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
  }

  .contact-copy {
    border: 1px solid color-mix(in oklab, var(--acc2) 46%, var(--line));
    background: color-mix(in oklab, var(--acc2) 10%, transparent);
    color: var(--acc2);
  }

  .contact-copy:hover,
  .contact-copy:focus-visible {
    background: var(--acc2);
    border-color: var(--acc2);
    color: #0a1828;
    outline: none;
  }

  .contact-copy[data-copied="true"] {
    background: color-mix(in oklab, var(--good) 14%, transparent);
    border-color: color-mix(in oklab, var(--good) 56%, transparent);
    color: var(--good);
  }

  .contact-mail {
    border: 1px solid color-mix(in oklab, var(--line) 74%, transparent);
    background: color-mix(in oklab, var(--surface) 80%, transparent);
    color: color-mix(in oklab, var(--muted) 88%, white);
  }

  .contact-mail:hover,
  .contact-mail:focus-visible {
    border-color: color-mix(in oklab, var(--acc) 52%, var(--line));
    color: var(--acc);
    outline: none;
  }

  .contact-foot {
    padding: 12px 18px 16px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
  }

  .contact-fade-enter-active,
  .contact-fade-leave-active {
    transition: opacity 180ms ease;
  }

  .contact-fade-enter-active .contact-dialog,
  .contact-fade-leave-active .contact-dialog {
    transition:
      transform 180ms ease,
      opacity 180ms ease;
  }

  .contact-fade-enter-from,
  .contact-fade-leave-to {
    opacity: 0;
  }

  .contact-fade-enter-from .contact-dialog,
  .contact-fade-leave-to .contact-dialog {
    transform: translateY(10px) scale(0.985);
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .contact-fade-enter-active,
    .contact-fade-leave-active,
    .contact-fade-enter-active .contact-dialog,
    .contact-fade-leave-active .contact-dialog {
      transition: none;
    }
  }

  @media (max-width: 560px) {
    .contact-mask {
      padding: 10px;
    }

    .contact-dialog {
      border-radius: 18px;
    }

    .contact-head,
    .contact-list,
    .contact-foot {
      padding-left: 14px;
      padding-right: 14px;
    }

    .contact-actions {
      flex: 1 1 auto;
      justify-content: flex-end;
    }
  }
</style>
