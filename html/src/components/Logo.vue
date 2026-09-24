<script setup>
import { LOGO } from '@/assets/logo.js'
</script>

<template>
  <!-- Lines take the text colour (currentColor), the star the tint colour -->
  <svg :viewBox="LOGO.viewBox" fill="none" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
    <g stroke="currentColor" stroke-width="1.6">
      <path v-for="d in LOGO.machine" :key="d" :d="d" />
    </g>
    <path class="star" :d="LOGO.star" stroke-width="1.4" />
  </svg>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';
.star { stroke: @accent; }
</style>
