<script setup>
import { ref, computed, provide, watch, onMounted, onUnmounted } from 'vue'
import { usePipelineStore }   from '@/stores/pipeline.js'
import { useCamera }          from '@/composables/useCamera.js'
import { usePipelineWorker }  from '@/composables/usePipelineWorker.js'
import { BLOCKS, BLOCK_MAP, BLOCK_REGISTRIES, allPlugins } from '@/plugins/index.js'
import StepRow from './StepRow.vue'

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
  const savedId = store.steps[0]?.values?.deviceId
  const firstId = camera.devices.value[0]?.deviceId
  const useId   = savedId || firstId
  if (!savedId && firstId) store.steps[0].values.deviceId = firstId
  await camera.start(useId || undefined)
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
const BLOCK_COLORS = { image: '#9d7fe0', vector: '#4fbf7b', grbl: '#f0a54a' }

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

function allCollapsed(blockId) {
  const s = store.steps.filter(st => st.blockId === blockId)
  return s.length > 0 && s.every(st => st.collapsed)
}

// ── Common row width ──────────────────────────────────────────────────────────
// Every step row gets the same width: parameter column + the picture at view height.
// The picture's aspect comes from the source image, so the view never letterboxes.
const PARAMS_W = 330
const VIEW_H   = 440

const rowWidth = computed(() => {
  const bmp    = worker.stepResults.value[0]?.bitmap
  const aspect = bmp ? bmp.width / bmp.height : 1
  return `${Math.round(PARAMS_W + VIEW_H * aspect) + 2}px`
})

// Plain-language names for the three stages
const BLOCK_TEXT = {
  image:  { title: 'Image',   hint: 'Prepare the picture',       add: 'Add another image filter' },
  vector: { title: 'Vectors', hint: 'Turn it into lines',        add: 'Add another vector filter' },
  grbl:   { title: 'Machine', hint: 'Create the file for your CNC', add: '' },
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
  if (pickerCtx.value.mode === 'replace') {
    const step = store.steps.find(s => s.instanceId === pickerCtx.value.replaceInstanceId)
    return `Replace ${allPlugins.get(step?.pluginId)?.label ?? 'step'}`
  }
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
    <div class="flow-col" :style="{ '--row-w': rowWidth }">

      <template v-for="(block, bi) in BLOCKS" :key="block.id">
        <section class="block" :class="{ last: bi === BLOCKS.length - 1 }" :style="{ '--bc': BLOCK_COLORS[block.id], '--next': BLOCK_COLORS[BLOCKS[bi + 1]?.id] ?? BLOCK_COLORS[block.id] }">
          <header class="block-head" @click="store.toggleBlockCollapsed(block.id)">
            <span class="block-mark" />
            <span class="block-title">{{ BLOCK_TEXT[block.id].title }}</span>
            <span class="block-hint">{{ BLOCK_TEXT[block.id].hint }}</span>
            <span class="block-toggle">{{ allCollapsed(block.id) ? 'Show all' : 'Hide all' }}</span>
          </header>

          <div class="block-steps">
            <template v-for="(step, si) in stepsForBlock(block.id)" :key="step.instanceId">

              <!-- Insert slot — only in front of freely configurable steps -->
              <button
                v-if="si > 0 && canRemove(step)"
                class="insert-slot"
                title="Insert a filter here"
                @click="openInsert(block.id, step.instanceId)"
              ><span>+</span></button>
              <div v-else-if="si > 0" class="step-gap" />

              <StepRow
                :step="step"
                :block-color="BLOCK_COLORS[block.id]"
                :can-remove="canRemove(step)"
                :is-mandatory="store.isMandatoryFirst(step.instanceId) || !!block.fixed"
                :whitelist="mandatoryWhitelist(step)"
                @remove="store.removeStep(step.instanceId)"
                @replace="openReplace(step.instanceId, mandatoryWhitelist(step))"
              />
            </template>

            <button v-if="!block.fixed" class="add-step" @click="openAppend(block.id)">
              <span class="add-node">+</span>{{ BLOCK_TEXT[block.id].add }}
            </button>
          </div>
        </section>
      </template>

      <div class="timeline-end">
        <span class="end-node">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        Ready to mill
      </div>
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

// Geometry of the timeline: the line is centred at @rail-x inside the left gutter,
// StepRow places its node centred on it.
@gutter: 68px;
@rail-x: 22px;
@rail-w: 4px;

.pipeline-flow {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: @bg;
}

.flow-col {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 80px;
}

// ── Block ─────────────────────────────────────────────────────────────────────
.block {
  position: relative;
  padding-bottom: 38px;

  // The timeline: block colour, blending into the next block's colour at the bottom
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: (@rail-x - (@rail-w / 2));
    top: 14px;
    bottom: 0;
    width: @rail-w;
    border-radius: @rail-w;
  }

  &::before {
    background: linear-gradient(var(--bc) 0%, var(--bc) calc(100% - 70px), var(--next) 100%);
    opacity: 0.55;
  }

  // Data flowing down the line — the pipeline runs live
  &::after {
    background: repeating-linear-gradient(180deg, fade(#fff, 55%) 0 8px, transparent 8px 28px);
    animation: flow 1.4s linear infinite;
    opacity: 0.18;
  }

  &.last { padding-bottom: 0; }
  // Last block: the line runs on into the end node below
  &.last::before,
  &.last::after { bottom: -40px; }
}

@keyframes flow {
  from { background-position: 0 0; }
  to   { background-position: 0 28px; }
}

@media (prefers-reduced-motion: reduce) {
  .block::after { animation: none; }
}

.block-head {
  position: relative;
  width: min(100%, calc(var(--row-w, 100%) + @gutter));
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 0 0 16px @gutter;
  cursor: pointer;
  user-select: none;

  &:hover .block-toggle { color: @text; }
}

.block-mark {
  position: absolute;
  left: @rail-x - 10px;
  top: 3px;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  transform: rotate(45deg);
  background: var(--bc);
  box-shadow: 0 0 0 5px @bg, 0 0 22px -2px var(--bc);
  z-index: 2;
}

.block-title {
  font-size: 18px;
  font-weight: 700;
  color: @text;
  letter-spacing: -0.01em;
}

.block-hint {
  flex: 1;
  font-size: 13px;
  color: @muted;
}

.block-toggle {
  font-size: 12px;
  color: @muted;
  transition: color 0.12s;
}

.block-steps {
  display: flex;
  flex-direction: column;
  padding-left: @gutter;
}

.step-gap { height: 10px; }

// Gap between rows that turns into an insert button on hover
.insert-slot {
  height: 10px;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
  padding: 0;

  span {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: @accent;
    color: #1a1204;
    font-size: 15px;
    font-weight: 700;
    line-height: 22px;
    opacity: 0;
    transition: opacity 0.12s;
    z-index: 5;
  }

  &:hover span { opacity: 1; }
}

.add-step {
  position: relative;
  align-self: flex-start;
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding: 6px 12px 6px 0;
  background: none;
  border: none;
  color: @muted;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.12s;

  &:hover { color: @text; }
  &:hover .add-node { border-color: var(--bc); color: var(--bc); }
}

// "+" node sitting on the timeline
.add-node {
  position: absolute;
  left: (@rail-x - @gutter - 14px);
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px dashed fade(@muted, 70%);
  background: @bg;
  color: @muted;
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
  z-index: 2;
  transition: border-color 0.12s, color 0.12s;
}

// End of the timeline
.timeline-end {
  position: relative;
  display: flex;
  align-items: center;
  height: 44px;
  margin-top: 26px;
  padding-left: @gutter;
  font-size: 13px;
  font-weight: 600;
  color: @muted;
}

.end-node {
  position: absolute;
  left: @rail-x - 22px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: @bg;
  border: 4px solid @accent;
  box-shadow: 0 0 22px -4px @accent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: @accent;
  z-index: 2;
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
