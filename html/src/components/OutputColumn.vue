<script setup>
import { inject, computed } from 'vue'
import CanvasPreview from './previews/CanvasPreview.vue'

const props = defineProps({
  plugin:    Object,
  values:    Object,
  stepIndex: Number,
})

const stepResults = inject('stepResults')

const result = computed(() => stepResults?.value?.[props.stepIndex] ?? null)
</script>

<template>
  <section class="column">
    <div class="col-label">Output</div>
    <div class="col-card">
      <component
        v-if="plugin?.OutputComponent"
        :is="plugin.OutputComponent"
        :result="result"
        :values="values"
      />
      <CanvasPreview
        v-else-if="plugin"
        :step-index="stepIndex"
        :is-input="false"
      />
      <div v-else class="placeholder">—</div>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';
@import './column.less';
</style>
