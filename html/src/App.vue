<script setup>
import { usePipelineStore } from '@/stores/pipeline.js'
import AppHeader    from '@/components/AppHeader.vue'
import PipelineFlow from '@/components/PipelineFlow.vue'
import StartScreen  from '@/components/StartScreen.vue'

const store = usePipelineStore()
</script>

<template>
  <template v-if="store.hasProject">
    <AppHeader />
    <PipelineFlow />
  </template>
  <StartScreen v-else />
</template>
