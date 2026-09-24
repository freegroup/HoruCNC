<script setup>
import { ref, shallowRef, computed, provide, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { usePipelineStore }   from '@/stores/pipeline.js'
import { useCamera }          from '@/composables/useCamera.js'
import { usePipelineWorker }  from '@/composables/usePipelineWorker.js'
import { BLOCKS, BLOCK_MAP, BLOCK_REGISTRIES, allPlugins } from '@/plugins/index.js'
import StepRow from './StepRow.vue'
import { process as processCamera } from '@/plugins/input/camera.worker.js'
import { UPLOAD } from '@/plugins/input/camera.js'
import { storage } from '@/stores/storage.js'
import FinishStep from './FinishStep.vue'

// The page header is big at the top and compact once scrolled (with hysteresis against flicker)
const emit = defineEmits(['compact'])
let compact = false
let scrollSave = 0
function onScroll(e) {
  const y = e.target.scrollTop
  const next = compact ? y > 8 : y > 60
  if (next !== compact) emit('compact', compact = next)
  // Remembered for the next reload (debounced — saving writes the whole state)
  clearTimeout(scrollSave)
  scrollSave = setTimeout(() => { store.ui.scrollTop = Math.round(y) }, 250)
}

const store  = usePipelineStore()
const camera = useCamera()
const worker = usePipelineWorker()

// ── Snapshot ──────────────────────────────────────────────────────────────────
// The pipeline always works on a snapshot. The first one is taken automatically once the
// camera has warmed up; "Take snapshot" replaces it. The live picture is only shown in the
// source step, as the "before" side of its compare view.
// With the source "Upload image" there is no camera at all: the uploaded file IS the snapshot.
const WARMUP_FRAMES = 12            // skip the dark first frames of a starting camera
const SNAPSHOT_KEY  = 'snapshot'
const MAX_SIDE      = 2048          // uploads are scaled down to this — keeps the stored JPEG small
const sourceId = computed(() => store.steps[0]?.values?.deviceId ?? '')
const isUpload = computed(() => sourceId.value === UPLOAD)
const frozenBitmap = ref(null)
const liveFrame    = shallowRef(null)   // live picture, through the camera step (crop/mirror/scale)
let frozenSent = false
let liveFrames = 0

async function captureSnapshot() {
  const bmp = await camera.captureFrame()
  if (!bmp) return
  setSnapshot(bmp)
}

function setSnapshot(bmp) {
  frozenBitmap.value?.close()
  frozenBitmap.value = bmp
  syncNativeRes()
  frozenSent = false
  saveSnapshot(bmp)
}

// The snapshot survives a reload (JPEG in localStorage) — otherwise a reload would take a
// new picture and every step would suddenly show something else
async function saveSnapshot(bmp) {
  try {
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    c.getContext('2d').drawImage(bmp, 0, 0)
    const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
    const url  = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob) })
    storage.set(SNAPSHOT_KEY, url)
  } catch { /* no persistence then */ }
}

// "Upload image": a file dialog, the chosen picture becomes the snapshot.
// Must be called from a click (browsers only open file dialogs on a user gesture).
function pickImage() {
  const input = document.createElement('input')
  input.type   = 'file'
  input.accept = 'image/*'
  input.onchange = () => { if (input.files?.[0]) useImageFile(input.files[0]) }
  input.click()
}

async function useImageFile(file) {
  try {
    let bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = MAX_SIDE / Math.max(bmp.width, bmp.height)
    if (scale < 1) {
      const small = await createImageBitmap(bmp, {
        resizeWidth:  Math.round(bmp.width * scale),
        resizeHeight: Math.round(bmp.height * scale),
        resizeQuality: 'high',
      })
      bmp.close()
      bmp = small
    }
    setSnapshot(bmp)
  } catch { /* not a readable image — keep the current one */ }
}

// The resolution presets are relative to the source's own resolution — for an upload
// that is the image, not the (stopped) camera
function syncNativeRes() {
  const b = frozenBitmap.value
  if (isUpload.value && b) camera.nativeRes.value = { w: b.width, h: b.height }
}

async function loadSnapshot() {
  const url = storage.get(SNAPSHOT_KEY)
  if (typeof url !== 'string') return
  try {
    frozenBitmap.value = await createImageBitmap(await (await fetch(url)).blob())
    frozenSent = false
    syncNativeRes()
  } catch { storage.remove(SNAPSHOT_KEY) }
}

// Other camera → a fresh first snapshot from it.
// Switching to "Upload image" keeps the current picture until a file is chosen.
watch(sourceId, id => {
  liveFrame.value?.bitmap?.close()
  liveFrame.value = null
  if (id === UPLOAD) { camera.stop(); syncNativeRes(); return }
  frozenBitmap.value?.close()
  frozenBitmap.value = null
  frozenSent = false
  liveFrames = 0
  storage.remove(SNAPSHOT_KEY)
  startCamera(id)
})

async function startCamera(id) {
  await camera.start(id || undefined)
  // Devices listed before the permission was granted have no names yet
  if (camera.isReady.value && camera.devices.value.some(d => !d.deviceId || !d.label)) await camera.enumerateDevices(false)
}

// Other camera params (dpi, physicalWidth, flipH) → re-run same frozen frame
// Other step params → also just re-run
watch(() => store.pipelineParams, () => { frozenSent = false }, { deep: true })

// ── Scroll position — restored once the first results have laid out the rows ──
const flowRef = ref(null)
const stopScrollRestore = watch(() => worker.stepResults.value.length, n => {
  if (!n) return
  nextTick(() => { if (flowRef.value) flowRef.value.scrollTop = store.ui.scrollTop })
  stopScrollRestore()
})

provide('camera',          camera)
provide('stepResults',     worker.stepResults)
provide('captureSnapshot', captureSnapshot)
provide('pickImage',       pickImage)
provide('isUpload',        isUpload)
provide('frozenBitmap',    frozenBitmap)
provide('liveFrame',       liveFrame)

// ── Processing loop ───────────────────────────────────────────────────────────
let rafId = null

async function loop() {
  const bitmap = isUpload.value ? null : await camera.captureFrame()
  if (bitmap && isUpload.value) bitmap.close()      // switched to upload meanwhile
  else if (bitmap) {
    if (!frozenBitmap.value && ++liveFrames >= WARMUP_FRAMES) {
      setSnapshot(await createImageBitmap(bitmap))
    }
    const live = await processCamera({ bitmap }, store.steps[0]?.values ?? {})
    bitmap.close()
    liveFrame.value?.bitmap?.close()
    liveFrame.value = live
  }
  // The pipeline only runs again when the snapshot or a parameter changed
  if (frozenBitmap.value && !frozenSent) {
    frozenSent = true
    worker.sendFrame(await createImageBitmap(frozenBitmap.value), store.pipelineParams)
  }
  rafId = requestAnimationFrame(loop)
}

onMounted(async () => {
  worker.configure(store.workerSteps)
  await loadSnapshot()             // before the camera could take an automatic one
  rafId = requestAnimationFrame(loop)
  // An uploaded picture needs no camera — list the webcams without asking for permission
  if (isUpload.value) { await camera.enumerateDevices(false); return }
  await camera.enumerateDevices()
  const savedId = sourceId.value
  const firstId = camera.devices.value[0]?.deviceId
  if (!savedId && firstId) {
    store.steps[0].values.deviceId = firstId      // the watcher starts it
    return
  }
  // No webcam (or no permission) and nothing chosen yet → start with an upload instead
  if (!savedId && !frozenBitmap.value && camera.error.value) {
    store.steps[0].values.deviceId = UPLOAD
    return
  }
  await startCamera(savedId)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  camera.stop()
  frozenBitmap.value?.close()
  liveFrame.value?.bitmap?.close()
})

watch(() => store.workerSteps, steps => worker.configure(steps))

// ── Block colours ─────────────────────────────────────────────────────────────

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

// ── Drag & drop reordering (within a block; its first step stays first) ────────
const drag = ref({ id: null, blockId: null })
const drop = ref({ id: null, after: false })

function onDragStart(step, e) {
  // Only the header drags (not e.g. text selected in the parameters)
  if (!canRemove(step) || !e.target.closest?.('.row-head')) return
  drag.value = { id: step.instanceId, blockId: step.blockId }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', step.instanceId)
  e.dataTransfer.setDragImage(e.currentTarget, 40, 30)
}

function onDragOver(step, e) {
  if (!drag.value.id || step.blockId !== drag.value.blockId) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const r = e.currentTarget.getBoundingClientRect()
  // Nothing goes in front of the mandatory first step
  const after = !canRemove(step) || e.clientY > r.top + r.height / 2
  drop.value = { id: step.instanceId, after }
}

function onDrop() {
  if (drag.value.id && drop.value.id) store.moveStepTo(drag.value.id, drop.value.id, drop.value.after)
  onDragEnd()
}

function onDragEnd() {
  drag.value = { id: null, blockId: null }
  drop.value = { id: null, after: false }
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
  image:  { title: 'Start',   hint: 'with a picture',           add: 'Add another image filter' },
  vector: { title: 'Convert', hint: 'to vectors',               add: 'Add another vector filter' },
  grbl:   { title: 'Manufacture', hint: 'get ready to cut', add: '' },
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

// Heading + one sentence that explains what is being chosen
const PICKER_TEXT = {
  replace: {
    vector: { title: 'How should the picture become lines?',
              text:  'Each method reads the picture in its own way. Pick one, then compare the result with the slider.' },
    image:  { title: 'Choose a different source',
              text:  'Where the picture comes from.' },
  },
  add: {
    image:  { title: 'Add an image filter',
              text:  'Image filters change the picture before it is turned into lines — more contrast, less noise, a smaller area.' },
    vector: { title: 'Add a vector filter',
              text:  'Vector filters work on the lines — smooth them, simplify them or put them in a better order for the machine.' },
  },
}

const pickerText = computed(() => {
  const ctx = pickerCtx.value
  if (!ctx) return null
  const mode = ctx.mode === 'replace' ? 'replace' : 'add'
  return PICKER_TEXT[mode][ctx.blockId] ?? { title: mode === 'replace' ? 'Choose a different method' : 'Add a filter', text: '' }
})

/** The plugin currently in place (replace mode) — marked in the list. */
const pickerCurrent = computed(() =>
  store.steps.find(s => s.instanceId === pickerCtx.value?.replaceInstanceId)?.pluginId ?? null)

function onPickerKey(e) { if (e.key === 'Escape') closePicker() }
watch(pickerCtx, open => {
  if (open) document.addEventListener('keydown', onPickerKey)
  else      document.removeEventListener('keydown', onPickerKey)
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
  <div ref="flowRef" class="pipeline-flow" @scroll.passive="onScroll">
    <div class="flow-col" :style="{ '--row-w': rowWidth }">

      <template v-for="(block, bi) in BLOCKS" :key="block.id">
        <section class="block">
          <header class="block-head">
            <div class="block-label">
              <span class="block-title">{{ BLOCK_TEXT[block.id].title }}</span>
              <span class="block-hint">{{ BLOCK_TEXT[block.id].hint }}</span>
            </div>
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

              <div
                class="drag-wrap"
                :class="{
                  dragging:      drag.id === step.instanceId,
                  'drop-before': drop.id === step.instanceId && !drop.after,
                  'drop-after':  drop.id === step.instanceId && drop.after,
                }"
                @dragstart="onDragStart(step, $event)"
                @dragover="onDragOver(step, $event)"
                @drop.prevent="onDrop"
                @dragend="onDragEnd"
              >
                <StepRow
                  :step="step"
                  :can-remove="canRemove(step)"
                  :movable="canRemove(step)"
                  :is-mandatory="store.isMandatoryFirst(step.instanceId) || !!block.fixed"
                  :whitelist="mandatoryWhitelist(step)"
                  @remove="store.removeStep(step.instanceId)"
                  @replace="openReplace(step.instanceId, mandatoryWhitelist(step))"
                />
              </div>
            </template>

            <button v-if="!block.fixed" class="add-step" @click="openAppend(block.id)">
              <span class="add-node">+</span>{{ BLOCK_TEXT[block.id].add }}
            </button>
          </div>
        </section>
      </template>

      <!-- Finish: looks like a section, but is always open -->
      <section class="block finish">
        <header class="block-head">
          <div class="block-label">
            <span class="block-title">Export</span>
            <span class="block-hint">your machine code</span>
          </div>
        </header>
        <div class="block-steps">
          <div class="finish-row">
            <span class="finish-node">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3.5-3.5M8 10l3.5-3.5M2.5 13.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <FinishStep />
          </div>
        </div>
      </section>
    </div>

    <!-- Plugin picker overlay -->
    <Teleport to="body">
      <div v-if="pickerCtx" class="picker-backdrop" @click="closePicker" />
      <div v-if="pickerCtx" class="picker-panel" role="dialog" :aria-label="pickerText.title">
        <header class="picker-head">
          <h3>{{ pickerText.title }}</h3>
          <p v-if="pickerText.text">{{ pickerText.text }}</p>
          <button class="picker-close" title="Close (Esc)" @click="closePicker">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </header>
        <div class="picker-list">
          <button
            v-for="p in pickerPlugins"
            :key="p.id"
            class="picker-item"
            :class="{ current: p.id === pickerCurrent }"
            @click="p.id === pickerCurrent ? closePicker() : addPlugin(p.id)"
          >
            <span class="pi-label">{{ p.label }}<span v-if="p.id === pickerCurrent" class="pi-badge">In use</span></span>
            <span class="pi-desc">{{ p.description }}</span>
          </button>
        </div>
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
@rail-w: 2px;
@inset:  14px;   // right padding of a section band
@label-w: 230px;
@section-gap: 28px;

.pipeline-flow {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: @bg;
}

.flow-col {
  max-width: 1320px;
  margin: 0 auto;
  padding: 36px 24px 80px;
  // Timeline geometry, also used by StepRow / FinishStep
  --lw:     @label-w;   // column left of the timeline for the section headings
  --gutter: @gutter;
  --rail-x: @rail-x;
  --inset:  0px;

  @media (max-width: 1000px) { --lw: 0px; }
}

// ── Section ───────────────────────────────────────────────────────────────────
// One quiet panel per section: heading on the left, the timeline through the middle,
// the filters on the right — the heading visibly belongs to every step next to it.
.block {
  position: relative;
  display: grid;
  grid-template-columns: var(--lw) 1fr;
  width: min(100%, calc(var(--lw) + @gutter + var(--row-w, 100%) + @inset));
  margin-bottom: @section-gap;
  padding: 24px @inset 24px 0;
  border-radius: 24px;
  border: 1px solid @hairline;
  background: @panel;

  // The timeline — a thin neutral line that runs on through the gap to the next section
  &::before {
    content: '';
    position: absolute;
    left: calc(var(--lw) + @rail-x - @rail-w / 2);
    top: 0;
    bottom: -@section-gap;
    width: @rail-w;
    background: @border;
  }
  &:first-child::before { top: 36px; }

  // Finish: the line ends at its node
  &.finish { margin-bottom: 0; }
  &.finish::before { bottom: auto; height: 56px; }

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
}

// Heading left of the timeline — stays in view while scrolling through the section
.block-head {
  position: sticky;
  top: 16px;
  align-self: start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 20px 0 28px;
  text-align: left;
  user-select: none;

  @media (max-width: 1000px) {
    position: static;
    align-items: flex-start;
    text-align: left;
    padding: 4px 0 16px @gutter;
  }
}

.block-label {
  display: grid;
  row-gap: 4px;
}

.block-title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: @text;
  line-height: 1.05;
}

.block-hint {
  font-size: 16px;
  color: @muted;
  letter-spacing: -0.01em;
}

.block-steps {
  display: flex;
  flex-direction: column;
  padding-left: @gutter;
}

.finish-row { position: relative; }

// Drag & drop: the dragged row fades, a line shows where it will land
.drag-wrap {
  position: relative;

  &.dragging { opacity: 0.4; }

  &.drop-before::before,
  &.drop-after::after {
    content: '';
    position: absolute;
    left: 0;
    width: min(100%, var(--row-w, 100%));
    height: 2px;
    border-radius: 2px;
    background: @accent;
    z-index: 3;
  }
  &.drop-before::before { top: -6px; }
  &.drop-after::after   { bottom: -6px; }
}

// Like a step node (StepRow), filled — the finish is always open
.finish-node {
  position: absolute;
  left: (@rail-x - @gutter - 20px);
  top: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: @on-accent;
  background: @accent;
  box-shadow: 0 0 0 6px @panel;
  z-index: 2;
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
    color: @on-accent;
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
  &:hover .add-node { border-color: @text; color: @text; }
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
  border: 1.5px solid @border;
  background: @panel;
  color: @muted;
  font-size: 16px;
  font-weight: 400;
  line-height: 25px;
  text-align: center;
  z-index: 2;
  transition: border-color 0.12s, color 0.12s;
}
</style>

<!-- Global styles for teleported picker -->
<style lang="less">
@import '@/assets/theme.less';

.picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: fade(#000, 45%);
}

.picker-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  width: min(560px, calc(100vw - 32px));
  max-height: min(80vh, 720px);
  display: flex;
  flex-direction: column;
  background: @surface;
  border: 1px solid @hairline;
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.picker-head {
  position: relative;
  padding: 22px 56px 16px 24px;
  border-bottom: 1px solid @hairline;

  h3 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: @text;
  }
  p {
    margin-top: 6px;
    font-size: 14px;
    line-height: 1.45;
    color: @muted;
  }
}

.picker-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: @surface2;
  color: @muted;
  cursor: pointer;

  &:hover { color: @text; }
}

.picker-list {
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.picker-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 12px;
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.1s, border-color 0.1s;

  &:hover { background: @surface2; }

  &.current {
    border-color: @hairline;
    background: fade(#fff, 3%);
  }

  .pi-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: @text;
  }
  .pi-desc {
    font-size: 13.5px;
    line-height: 1.45;
    color: @muted;
  }
}

.pi-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: @accent-soft;
  color: @accent;
}

.picker-empty {
  font-size: 13px;
  color: @muted;
  padding: 16px;
  text-align: center;
}
</style>
