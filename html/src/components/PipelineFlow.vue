<script setup>
import { ref, computed, provide, watch, onMounted, onUnmounted } from 'vue'
import { usePipelineStore }   from '@/stores/pipeline.js'
import { useCamera }          from '@/composables/useCamera.js'
import { usePipelineWorker }  from '@/composables/usePipelineWorker.js'
import { BLOCKS, BLOCK_MAP, BLOCK_REGISTRIES, allPlugins } from '@/plugins/index.js'
import StepCard    from './StepCard.vue'
import StepPreview from './StepPreview.vue'
import FlowArrow   from './FlowArrow.vue'

const store  = usePipelineStore()
const camera = useCamera()
const worker = usePipelineWorker()

// ── Frozen frame ──────────────────────────────────────────────────────────────
const frozenBitmap = ref(null)
let frozenSent = false

async function captureSnapshot() {
  frozenBitmap.value?.close()
  frozenBitmap.value = await camera.captureFrame()
  frozenSent = false
}

// Camera deviceId change → must go live (different camera source)
watch(() => store.steps[0]?.values?.deviceId, () => {
  frozenBitmap.value?.close()
  frozenBitmap.value = null
  frozenSent = false
})

// Other camera params (dpi, physicalWidth, flipH) → re-run same frozen frame
// Other step params → also just re-run
watch(() => store.pipelineParams, () => { frozenSent = false }, { deep: true })

provide('camera',          camera)
provide('stepResults',     worker.stepResults)
provide('captureSnapshot', captureSnapshot)
provide('frozenBitmap',    frozenBitmap)

// ── Processing loop ───────────────────────────────────────────────────────────
let rafId = null

async function loop() {
  if (frozenBitmap.value) {
    if (!frozenSent) {
      const bmp = await createImageBitmap(frozenBitmap.value)
      worker.sendFrame(bmp, store.pipelineParams)
      frozenSent = true
    }
  } else {
    const bitmap = await camera.captureFrame()
    if (bitmap) worker.sendFrame(bitmap, store.pipelineParams)
  }
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
  frozenBitmap.value?.close()
})

watch(() => store.workerSteps, steps => worker.configure(steps))
watch(() => store.steps[0]?.values?.deviceId, deviceId => camera.start(deviceId || undefined))

// ── Block colours ─────────────────────────────────────────────────────────────
const BLOCK_COLORS = { image: '#9d7fe0', vector: '#52c97a', grbl: '#f0a030' }

// ── Step helpers ──────────────────────────────────────────────────────────────
function stepsForBlock(blockId) {
  return store.steps
    .map((s, i) => ({ ...s, index: i }))
    .filter(s => s.blockId === blockId)
}

function pluginFor(step) { return allPlugins.get(step.pluginId) }

function canRemove(step) {
  if (store.isMandatoryFirst(step.instanceId)) return false
  return !BLOCK_MAP[step.blockId]?.fixed
}

function mandatoryWhitelist(step) {
  return BLOCK_MAP[step.blockId]?.mandatoryFirst?.whitelist ?? []
}

// Camera also shows its output preview (the processed/scaled frame)
function hasPreview(_step) {
  return true
}

// ── Plugin picker ─────────────────────────────────────────────────────────────
const pickerCtx = ref(null)

const pickerPlugins = computed(() => {
  if (!pickerCtx.value) return []
  if (pickerCtx.value.mode === 'replace') {
    return (pickerCtx.value.whitelist ?? []).map(id => allPlugins.get(id)).filter(Boolean)
  }
  const reg = BLOCK_REGISTRIES[pickerCtx.value.blockId]
  return reg ? [...reg.values()] : []
})

const pickerTitle = computed(() => {
  if (!pickerCtx.value) return ''
  if (pickerCtx.value.mode === 'replace') return 'Change Vectorizer'
  return `Add ${BLOCKS.find(b => b.id === pickerCtx.value.blockId)?.label ?? ''} Filter`
})

function closePicker() { pickerCtx.value = null }

function openAppend(blockId) {
  pickerCtx.value = { blockId, beforeInstanceId: null, mode: 'add' }
}

function openInsert(blockId, beforeInstanceId) {
  pickerCtx.value = { blockId, beforeInstanceId, mode: 'add' }
}

function openReplace(instanceId, whitelist) {
  const step = store.steps.find(s => s.instanceId === instanceId)
  if (!step) return
  pickerCtx.value = { blockId: step.blockId, mode: 'replace', replaceInstanceId: instanceId, whitelist }
}

function addPlugin(pluginId) {
  const ctx = pickerCtx.value
  if (ctx.mode === 'replace') {
    store.replaceStep(ctx.replaceInstanceId, pluginId)
  } else if (ctx.beforeInstanceId) {
    store.addStepBefore(ctx.beforeInstanceId, pluginId)
  } else {
    store.addStep(ctx.blockId, pluginId)
  }
  closePicker()
}
</script>

<template>
  <div class="pipeline-flow">
    <div class="flow-track">

      <template v-for="(block, bi) in BLOCKS" :key="block.id">

        <!-- Between-block arrow -->
        <div v-if="bi > 0" class="block-arrow">
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
            <path d="M2 2L8 8L2 14"    stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M11 2L17 8L11 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <!-- Block zone -->
        <div class="block-zone" :class="block.id">
          <span class="zone-label">{{ block.label }}</span>

          <div class="zone-row">
            <template v-for="(step, si) in stepsForBlock(block.id)" :key="step.instanceId">

              <!-- Insert arrow between steps -->
              <FlowArrow
                v-if="si > 0"
                :size="48"
                :insertable="canRemove(step)"
                :color="BLOCK_COLORS[block.id]"
                @insert="openInsert(block.id, step.instanceId)"
              />

              <!-- Step card with params -->
              <StepCard
                :step="step"
                :block-color="BLOCK_COLORS[block.id]"
                :can-remove="canRemove(step)"
                :is-mandatory="store.isMandatoryFirst(step.instanceId)"
                :whitelist="mandatoryWhitelist(step)"
                @remove="store.removeStep(step.instanceId)"
                @replace="openReplace(step.instanceId, mandatoryWhitelist(step))"
              />

              <!-- Arrow between card and preview -->
              <FlowArrow v-if="hasPreview(step)" :size="48" :color="BLOCK_COLORS[block.id]" />

              <!-- Output preview (skipped for camera) -->
              <StepPreview
                v-if="hasPreview(step)"
                :step-index="step.index"
                :instance-id="step.instanceId"
                :plugin="pluginFor(step)"
                :values="step.values"
                :block-color="BLOCK_COLORS[block.id]"
              />

            </template>

            <!-- Append button for non-fixed blocks -->
            <button
              v-if="!block.fixed"
              class="zone-add"
              :title="`Add ${block.label} filter`"
              @click="openAppend(block.id)"
            >+</button>
          </div>
        </div>

      </template>
    </div>

    <!-- Plugin picker overlay -->
    <Teleport to="body">
      <div v-if="pickerCtx" class="picker-backdrop" @click="closePicker" />
      <div v-if="pickerCtx" class="picker-panel">
        <div class="picker-head">{{ pickerTitle }}</div>
        <button
          v-for="p in pickerPlugins"
          :key="p.id"
          class="picker-item"
          @click="addPlugin(p.id)"
        >
          <span class="pi-label">{{ p.label }}</span>
          <span class="pi-desc">{{ p.description }}</span>
        </button>
        <p v-if="pickerPlugins.length === 0" class="picker-empty">No filters available</p>
      </div>
    </Teleport>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

@c-image:  #9d7fe0;
@c-vector: #52c97a;
@c-grbl:   @accent;

// ── Outer container ───────────────────────────────────────────────────────────
.pipeline-flow {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: @bg;
  background-image: radial-gradient(circle, fade(@border, 70%) 1px, transparent 1px);
  background-size: 22px 22px;
}

// ── Horizontal scrolling track ────────────────────────────────────────────────
.flow-track {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: visible;
  padding: 20px;
  gap: 10px;
  scrollbar-width: thin;
  scrollbar-color: @border transparent;

  &::-webkit-scrollbar        { height: 5px; }
  &::-webkit-scrollbar-track  { background: transparent; }
  &::-webkit-scrollbar-thumb  { background: @border; border-radius: 3px; }
}

// ── Between-block arrow ───────────────────────────────────────────────────────
@ba-color: #7878b8;

.block-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-shrink: 0;
  width: 48px;
  height: 28px;
  border-radius: 8px;
  background: fade(@ba-color, 14%);
  border: 1px solid fade(@ba-color, 35%);
  color: @ba-color;
  box-shadow: 0 0 12px fade(@ba-color, 20%);
}

// ── Block zone ────────────────────────────────────────────────────────────────
.block-zone {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 12px;
  padding: 8px 10px 10px;
  flex-shrink: 0;
  backdrop-filter: blur(2px);

  &.image  { border: 1px solid fade(@c-image,  45%); background: fade(@c-image,  7%); box-shadow: 0 0 40px fade(@c-image,  6%) inset; }
  &.vector { border: 1px solid fade(@c-vector, 45%); background: fade(@c-vector, 7%); box-shadow: 0 0 40px fade(@c-vector, 6%) inset; }
  &.grbl   { border: 1px solid fade(@c-grbl,   45%); background: fade(@c-grbl,   7%); box-shadow: 0 0 40px fade(@c-grbl,   6%) inset; }
}

.zone-label {
  font-size: 7.5px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding: 0 2px;
  flex-shrink: 0;

  .image  & { color: fade(@c-image,  80%); }
  .vector & { color: fade(@c-vector, 80%); }
  .grbl   & { color: fade(@c-grbl,   80%); }
}

// ── Steps row inside a block ──────────────────────────────────────────────────
.zone-row {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
}

// ── Append button ─────────────────────────────────────────────────────────────
.zone-add {
  align-self: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px dashed @border;
  background: none;
  color: @muted;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  flex-shrink: 0;
  transition: color 0.12s, border-color 0.12s, background 0.12s;

  &:hover {
    color: @accent;
    border-color: @accent;
    border-style: solid;
    background: fade(@accent, 8%);
  }
}
</style>

<!-- Global styles for teleported picker -->
<style lang="less">
@import '@/assets/theme.less';

.picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.picker-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: @surface;
  border: 1px solid @border;
  border-radius: 10px;
  padding: 8px;
  min-width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.picker-head {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: @muted;
  padding: 4px 8px 7px;
  border-bottom: 1px solid @border;
  margin-bottom: 3px;
}

.picker-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 6px;
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.1s, border-color 0.1s;

  &:hover { background: @surface2; border-color: @border; }

  .pi-label { font-size: 12px; font-weight: 600; color: @text; }
  .pi-desc  { font-size: 10px; color: @muted; line-height: 1.4; }
}

.picker-empty {
  font-size: 11px;
  color: @muted;
  padding: 8px 10px;
  text-align: center;
}
</style>
