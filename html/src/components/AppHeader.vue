<script setup>
// Brand-only header — no pipeline logic here
</script>

<template>
  <header class="app-header">
    <div class="brand-icon">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <circle cx="15" cy="15" r="13.25" stroke="currentColor" stroke-width="1.5"/>
        <path d="M15 3.5V8 M15 22V26.5 M3.5 15H8 M22 15H26.5"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="15" cy="15" r="5" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="15" cy="15" r="1.75" fill="currentColor"/>
      </svg>
    </div>
    <div class="brand-text">
      <span class="brand-name">HoruCNC</span>
      <span class="brand-slogan">Camera · Contour · Machine</span>
    </div>
  </header>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.app-header {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 20px;
  background: @surface;
  border-bottom: 1px solid fade(@border, 55%);
  flex-shrink: 0;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0; top: 7px; bottom: 7px;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: @accent;
    opacity: 0.8;
  }
}

.brand-icon {
  color: @accent;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 0 6px fade(@accent, 35%));
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: @text;
  line-height: 1;
}

.brand-slogan {
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: @muted;
  line-height: 1;
}
</style>
