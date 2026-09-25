<script setup>
import Logo from '../Logo.vue'
// The top bar of the site pages: the HoruCNC wordmark (its "Horu" explains itself on hover)
// and the page's own links in the default slot.
defineProps({ home: { type: String, default: 'index.html' } })
</script>

<template>
  <header class="nav">
    <a class="brand" :href="home" aria-label="HoruCNC">
      <Logo class="brand-logo" /><span class="wordmark"><span class="horu" data-tip="彫る (horu) — Japanese: to carve · engrave · sculpt">Horu</span><span class="brand-cnc">CNC</span></span>
    </a>
    <nav class="nav-links"><slot /></nav>
  </header>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px @page-pad;
  background: fade(@bg, 82%);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid @hairline;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 780;
  letter-spacing: -0.025em;
  color: @text;
  text-decoration: none;
}
.brand-logo { width: 36px; height: 36px; }

// "Horu" reveals its meaning: dotted underline signals it, tooltip explains it
.horu {
  position: relative;
  text-decoration: underline dotted @accent-line;
  text-underline-offset: 3px;
  cursor: help;

  &::after {
    content: attr(data-tip);
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    z-index: 20;
    width: max-content;
    max-width: 280px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid @hairline;
    background: @panel;
    color: @text;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    white-space: normal;
    opacity: 0;
    transform: translateY(-3px);
    pointer-events: none;
    transition: opacity 0.15s, transform 0.15s;
  }
  &:hover::after { opacity: 1; transform: translateY(0); }
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;

  :slotted(a:not(.btn)) { color: @muted; text-decoration: none; font-size: 14px; font-weight: 500; &:hover { color: @text; } }

  @media (max-width: 560px) { :slotted(a:not(.btn)) { display: none; } }
}
</style>
