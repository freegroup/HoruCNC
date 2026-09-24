<script setup>
import { ref } from 'vue'
import AppHeader    from '@/components/AppHeader.vue'
import PipelineFlow from '@/components/PipelineFlow.vue'

const compact = ref(false)
</script>

<template>
  <AppHeader :compact="compact" />
  <PipelineFlow @compact="compact = $event" />
</template>
