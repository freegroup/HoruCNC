<script setup>
defineProps({
  color: { type: String, default: '#7878b8' },
})
</script>

<template>
  <div class="block-chevron" :style="{ '--c': color }">
    <svg class="chevron-svg" viewBox="0 0 40 200" preserveAspectRatio="none">
      <polygon
        points="0,0 24,0 40,100 24,200 0,200 16,100"
        class="chevron-poly"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </div>
    <div class="block-chevron" :style="{ '--c': color }">
    <svg class="chevron-svg" viewBox="0 0 40 200" preserveAspectRatio="none">
      <polygon
        points="0,0 24,0 40,100 24,200 0,200 16,100"
        class="chevron-poly"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </div>
</template>

<style lang="less" scoped>
.block-chevron {
  width: 40px;
  align-self: stretch;
  flex-shrink: 0;
  margin-left: -20px;
  overflow: visible;
}

.chevron-svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.chevron-poly {
  fill: var(--c);
  fill-opacity: 0.08;
  stroke: var(--c);
  stroke-opacity: 0.45;
  stroke-width: 5;
}
</style>
