<script setup>
  // 相关项目推广位：竞速档案站 CN
  const promo = {
    href: "https://hsr-endgame-archive-cn.netlify.app/",
    kicker: "相关项目",
    title: "竞速档案站 · CN",
    sub: "聚焦终局竞速记录、队伍组合与赛季样本的公开档案库",
    cta: "前往查看",
  };
</script>

<template>
  <aside class="promo-slot" aria-label="相关项目推广">
    <a
      class="promo-slot-link"
      :href="promo.href"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`${promo.title}（在新标签页打开）`"
    >
      <span class="promo-slot-mark" aria-hidden="true">档</span>
      <span class="promo-slot-copy">
        <span class="promo-slot-kicker">{{ promo.kicker }}</span>
        <span class="promo-slot-title">{{ promo.title }}</span>
        <span class="promo-slot-sub">{{ promo.sub }}</span>
      </span>
      <span class="promo-slot-cta" aria-hidden="true">
        {{ promo.cta }}
        <svg
          class="promo-slot-cta-ico"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </svg>
      </span>
    </a>
  </aside>
</template>

<style scoped>
  .promo-slot {
    padding: 10px 14px;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 60%, transparent);
    background: linear-gradient(
      90deg,
      color-mix(in oklab, var(--acc2) 14%, transparent),
      color-mix(in oklab, var(--acc) 8%, transparent) 60%,
      transparent
    );
  }

  .promo-slot-link {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 46px;
    padding: 8px 14px;
    border-radius: 18px;
    border: 1px solid color-mix(in oklab, var(--line-strong) 60%, transparent);
    background:
      linear-gradient(180deg, var(--surface-soft), var(--surface)),
      radial-gradient(
        120% 160% at 0% 0%,
        color-mix(in oklab, var(--acc2) 12%, transparent),
        transparent 50%
      );
    text-decoration: none;
    color: inherit;
    box-shadow: var(--shadow-soft);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .promo-slot-link:hover,
  .promo-slot-link:focus-visible {
    border-color: color-mix(in oklab, var(--acc2) 64%, var(--line-strong));
    box-shadow:
      0 18px 42px rgba(2, 8, 16, 0.42),
      0 0 0 1px color-mix(in oklab, var(--acc2) 36%, transparent);
    transform: translateY(-1px);
    outline: none;
  }

  .promo-slot-mark {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--acc), var(--acc2));
    color: #0a1828;
    font-size: 15px;
    font-weight: 760;
    flex-shrink: 0;
    box-shadow: 0 8px 22px color-mix(in oklab, var(--acc) 28%, transparent);
  }

  .promo-slot-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .promo-slot-kicker {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--acc2);
  }

  .promo-slot-title {
    font-size: 14px;
    font-weight: 720;
    line-height: 1.2;
    color: var(--text);
  }

  .promo-slot-sub {
    font-size: 12px;
    line-height: 1.4;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .promo-slot-cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, var(--acc2) 60%, transparent);
    background: color-mix(in oklab, var(--acc2) 10%, transparent);
    color: var(--acc2);
    font-size: 12px;
    font-weight: 680;
    white-space: nowrap;
    flex-shrink: 0;
    transition:
      background 180ms ease,
      color 180ms ease;
  }

  .promo-slot-cta-ico {
    width: 14px;
    height: 14px;
  }

  .promo-slot-link:hover .promo-slot-cta,
  .promo-slot-link:focus-visible .promo-slot-cta {
    background: var(--acc2);
    color: #0a1828;
  }

  @media (max-width: 640px) {
    .promo-slot {
      padding: 8px 10px;
    }

    .promo-slot-link {
      gap: 10px;
      padding: 8px 10px;
    }

    .promo-slot-mark {
      width: 32px;
      height: 32px;
      font-size: 13px;
    }

    .promo-slot-sub {
      display: none;
    }

    .promo-slot-cta {
      padding: 5px 10px;
    }
  }
</style>
