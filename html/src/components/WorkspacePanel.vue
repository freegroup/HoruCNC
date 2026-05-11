<script setup>
import { provide, watch, onMounted, onUnmounted } from 'vue'
import { usePipelineStore }   from '@/stores/pipeline.js'
import { useCamera }          from '@/composables/useCamera.js'
import { usePipelineWorker }  from '@/composables/usePipelineWorker.js'
import InputColumn      from './InputColumn.vue'
import ParameterColumn  from './ParameterColumn.vue'
import OutputColumn     from './OutputColumn.vue'
import ArrowConnector   from './ArrowConnector.vue'

const store  = usePipelineStore()
const camera = useCamera()
const worker = usePipelineWorker()

provide('camera',      camera)
provide('stepResults', worker.stepResults)

// Live processing loop
let rafId = null

async function loop() {
  const bitmap = await camera.captureFrame()
  if (bitmap) worker.sendFrame(bitmap, store.pipelineParams)
  rafId = requestAnimationFrame(loop)
}

onMounted(async () => {
  worker.configure(store.workerSteps)
  await camera.enumerateDevices()
  await camera.start()
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  camera.stop()
})

// Reconfigure worker when step list changes
watch(() => store.workerSteps, (steps) => {
  worker.configure(steps)
})

// Restart camera when user selects a different device
watch(
  () => store.steps[0]?.values?.deviceId,
  (deviceId) => camera.start(deviceId || undefined),
)
</script>

<template>
  <div class="workspace-wrap">
    <div v-if="store.activePlugin" class="step-header">
      <span class="step-lbl">step</span>
      <span class="step-bg-num">{{ String(store.activeIndex + 1).padStart(2, '0') }}</span>
      <div class="step-content">
        <div class="step-title">{{ store.activePlugin.label }}</div>
        <div class="step-desc">{{ store.activePlugin.description }}</div>
      </div>
    </div>

    <main class="workspace">
      <InputColumn
        :plugin="store.activePlugin"
        :values="store.activeStep?.values"
        :step-index="store.activeIndex"
      />
      <ArrowConnector />
      <ParameterColumn
        :plugin="store.activePlugin"
        :values="store.activeStep?.values"
      />
      <ArrowConnector />
      <OutputColumn
        :plugin="store.activePlugin"
        :values="store.activeStep?.values"
        :step-index="store.activeIndex"
      />
    </main>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.workspace-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: @bg;
}

.step-header {
  position: relative;
  height: 78px;
  overflow: hidden;
  background: @surface;
  border-bottom: 1px solid @border;
  flex-shrink: 0;
}

.step-lbl {
  position: absolute;
  top: 10px;
  left: 22px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: @accent;
  opacity: 0.75;
}

.step-bg-num {
  position: absolute;
  left: 10px;
  bottom: -10px;
  font-size: 92px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -3px;
  color: @accent;
  opacity: 0.22;
  pointer-events: none;
  user-select: none;
}

.step-content {
  position: absolute;
  left: 68px;
  bottom: 14px;

  .step-title {
    font-size: 17px;
    font-weight: 700;
    color: @text;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1.2;
  }

  .step-desc {
    font-size: 10px;
    color: #999;
    margin-top: 3px;
  }
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 52px 260px 52px 1fr;
  padding: 20px;
  min-height: 0;
  gap: 0;
}
</style>
