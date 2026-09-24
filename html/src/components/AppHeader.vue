<script setup>
import Logo from './Logo.vue'
// Brand + one-line promise. Big at the top of the page, a slim bar once the pipeline scrolls.
defineProps({ compact: Boolean })
</script>

<template>
  <header class="app-header" :class="{ compact }">
    <div class="inner">
      <!-- Logo leads back to the start page (index.html) -->
      <a class="brand" href="index.html" title="Back to the start page">
        <div class="brand-icon">
          <Logo />
        </div>
        <div class="brand-text">
          <span class="brand-name">HoruCNC</span>
          <span class="brand-slogan">Camera · Contour · Machine</span>
        </div>
      </a>
      <a class="home-link" href="index.html">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Home
      </a>

      <div class="hero">
        <div class="hero-body">
          <h1>From a picture <span>to a <em class="cnc" data-text="CNC">CNC</em> program.</span></h1>
          <p>Pick a few filters, watch the result live and download the file for your machine.
             No programming — anyone can do it.</p>
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

@ease: 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);

.app-header {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  background: @surface;
  border-bottom: 1px solid @hairline;
}

// Same column as the pipeline below (PipelineFlow .flow-col)
.inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 28px 24px 40px;
  transition: padding @ease;

  .compact & { padding-top: 9px; padding-bottom: 9px; }
}

.inner { position: relative; }

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.home-link {
  position: absolute;
  top: 28px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px 6px 8px;
  border-radius: 999px;
  border: 1px solid @hairline;
  color: @muted;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.12s, border-color 0.12s, top @ease;

  &:hover { color: @text; border-color: @border; }
  .compact & { top: 9px; }
}

.brand-icon {
  color: @text;
  display: flex;


  svg {
    width: 44px;
    height: 44px;
    transition: width @ease, height @ease;
    .compact & { width: 26px; height: 26px; }
  }
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.brand-name {
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: @text;
  line-height: 1;
  transition: font-size @ease;

  .compact & { font-size: 14px; }
}

.brand-slogan {
  font-family: @mono;
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: @muted;
  line-height: 1;
  transition: font-size @ease;

  .compact & { font-size: 8.5px; }
}

// Collapses smoothly: grid row 1fr → 0fr
.hero {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows @ease, opacity @ease;

  .compact & { grid-template-rows: 0fr; opacity: 0; }
}

.hero-body {
  overflow: hidden;
  padding-left: 56px;   // under the brand name, next to the icon

  h1 {
    margin: 34px 0 12px;
    font-size: clamp(30px, 4.4vw, 52px);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.05;
    color: @text;

    span { color: @muted; }
    .cnc { .cnc-mark(@surface); }
  }

  p {
    margin: 0;
    max-width: 560px;
    font-size: 17px;
    line-height: 1.45;
    letter-spacing: -0.01em;
    color: @muted;
  }
}

@media (max-width: 600px) {
  .hero-body { padding-left: 0; }
}
</style>
