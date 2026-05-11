<script setup>
import CanvasPreview from './previews/CanvasPreview.vue'

const props = defineProps({
  plugin:    Object,
  values:    Object,
  stepIndex: Number,
})
</script>

<template>
  <section class="column">
    <div class="col-label">Input</div>
    <div class="col-card">
      <component
        v-if="plugin?.InputComponent"
        :is="plugin.InputComponent"
        :values="values"
        :step-index="stepIndex"
      />
      <CanvasPreview
        v-else-if="plugin"
        :step-index="stepIndex"
        :is-input="true"
      />
      <div v-else class="placeholder">—</div>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';
@import './column.less';
</style>
