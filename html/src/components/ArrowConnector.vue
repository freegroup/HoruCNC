<template>
  <div class="arrow-col">
    <svg class="arrow" width="36" height="20" viewBox="0 0 36 20" fill="none">
      <path
        d="M2 10 H30 M22 3 L32 10 L22 17"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.arrow-col {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 26px;
}

.arrow {
  color: @accent;
  opacity: 0.45;
}
</style>
