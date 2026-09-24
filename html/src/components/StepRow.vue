<script setup>
import { inject, computed, ref, watch, nextTick, onUnmounted } from 'vue'
import { usePipelineStore } from '@/stores/pipeline.js'
import { allPlugins }       from '@/plugins/index.js'
import StepParams  from './StepParams.vue'
import BeforeAfter from './previews/BeforeAfter.vue'
import StepThumb   from './previews/StepThumb.vue'

/**
 * One pipeline step as a row: header (collapsible) + parameters on the left and the
 * step's view on the right. The view depends on the step type:
 *   compare — before/after divider (input of the step vs. its output)
 *   edit    — the plugin's interactive overlay (e.g. crop handles)
 *   output  — the plugin's own output component (3D vector view, G-code toolpath)
 */
const props = defineProps({
  step:        Object,   // store step + `index` (position in the whole pipeline)
  canRemove:   Boolean,
  isMandatory: Boolean,
  movable:     Boolean,   // can be dragged to another position in its block
  whitelist:   { type: Array, default: () => [] },
})

const emit = defineEmits(['remove', 'replace'])

const store           = usePipelineStore()
const stepResults     = inject('stepResults')
const camera          = inject('camera', null)
const captureSnapshot = inject('captureSnapshot', null)
const liveFrame       = inject('liveFrame', null)
const pickImage       = inject('pickImage', null)
const isUpload        = inject('isUpload', ref(false))

const plugin   = computed(() => allPlugins.get(props.step.pluginId))
const isSource = computed(() => plugin.value?.inputType === 'none')
const isGcode  = computed(() => plugin.value?.outputType === 'gcode')

const result     = computed(() => stepResults?.value?.[props.step.index] ?? null)
// Camera step: the live picture is "before", the snapshot the pipeline works on is "after"
const prevResult = computed(() => isSource.value ? liveFrame?.value ?? null : stepResults?.value?.[props.step.index - 1] ?? null)
const compareLabels = computed(() => isSource.value ? ['Live', 'Snapshot'] : ['Before', 'After'])

/** The raster the contours of this step were traced from — backdrop for path views. */
const baseImage = computed(() => {
  const rs = stepResults?.value ?? []
  for (let i = props.step.index; i >= 0; i--) {
    if (rs[i]?.bitmap && !rs[i].contours) return rs[i]
  }
  return null
})

// ── Views ─────────────────────────────────────────────────────────────────────
const views = computed(() => {
  const p = plugin.value
  const v = []
  if (p?.OverlayComponent) v.push({ id: 'edit', label: 'Adjust' })
  if (!isGcode.value)      v.push({ id: 'compare', label: !isSource.value ? 'Before / After' : isUpload.value ? 'Picture' : 'Live / Snapshot' })
  // A plugin can offer several looks at its output (G-code: 3D piece / CAM paths) —
  // one tab each, all rendered by the same, kept-alive OutputComponent
  if (p?.outputModes) for (const m of p.outputModes) v.push({ id: `output:${m.id}`, label: m.label })
  else if (p?.OutputComponent) v.push({ id: 'output', label: '3D' })
  return v
})

// Before/after divider: ONE position in the store for all steps — move one, all follow
// (like the shared 3D camera). Also kept across reloads.
const splitPos = computed({
  get: () => store.ui.split,
  set: v => { store.ui.split = Math.round(v * 1000) / 1000 },
})

// The chosen view is part of the persisted UI state — a reload keeps it
const selectedView = computed({
  get: () => store.ui.views[props.step.instanceId] ?? null,
  set: id => { store.ui.views[props.step.instanceId] = id },
})
const view = computed(() =>
  views.value.some(v => v.id === selectedView.value) ? selectedView.value : views.value[0]?.id
)

const viewRef = ref(null)
const isOutput   = computed(() => view.value?.startsWith('output'))
const outputMode = computed(() => view.value?.split(':')[1])

// ── Fullscreen (parameters + view) ────────────────────────────────────────────
// Real browser fullscreen (Fullscreen API) on the step body. Esc is handled by the browser
// and reported via `fullscreenchange`. Where the API is missing or refused, the body
// still fills the window as an overlay and Esc closes it.
const fullscreen  = ref(false)
const rowBodyRef  = ref(null)

async function enterFullscreen() {
  fullscreen.value = true
  await nextTick()   // the body is teleported to <body> first
  try { await rowBodyRef.value?.requestFullscreen?.() } catch { /* overlay fallback */ }
}

function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  fullscreen.value = false
}

function toggleFullscreen() {
  fullscreen.value ? exitFullscreen() : enterFullscreen()
}

function onFullscreenChange() {
  if (!document.fullscreenElement) fullscreen.value = false
}
function onKeydown(e) {
  if (e.key === 'Escape' && !document.fullscreenElement) fullscreen.value = false
}
watch(fullscreen, on => {
  const fn = on ? 'addEventListener' : 'removeEventListener'
  document[fn]('keydown', onKeydown)
  document[fn]('fullscreenchange', onFullscreenChange)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (fullscreen.value && document.fullscreenElement) document.exitFullscreen().catch(() => {})
})

// VectorPreview starts in 2D; the "3D" tab switches it over as soon as it is mounted
watch(viewRef, (inst) => {
  if (view.value !== 'output' || isGcode.value) return
  if (inst?.mode === '2d') inst.toggleMode?.()
})

// ── Dimensions footer ─────────────────────────────────────────────────────────
const dimensions = computed(() => {
  const r = result.value
  if (!r) return null
  const mpp = r.meta?.mmPerPixel

  if (r.contours?.length) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const contour of r.contours) {
      for (const [x, y] of contour) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
    if (!isFinite(minX)) return null
    const pw = maxX - minX, ph = maxY - minY
    const size = mpp ? `${Math.round(pw * mpp)} × ${Math.round(ph * mpp)} mm` : null
    const n    = `${r.contours.length} ${r.contours.length === 1 ? 'line' : 'lines'}`
    return size ? `${n} · ${size}` : n
  }
  if (r.bitmap) {
    const w = r.bitmap.width, h = r.bitmap.height
    return mpp ? `${Math.round(w * mpp)} × ${Math.round(h * mpp)} mm` : null
  }
  return null
})

const collapsed = computed(() => !!props.step.collapsed)

</script>

<template>
  <div class="step-row" :class="{ collapsed }">

    <!-- Node on the pipeline rail (drawn by PipelineFlow) -->
    <span class="node">{{ step.index + 1 }}</span>

    <!-- Header — click toggles collapse -->
    <div
      class="row-head"
      :class="{ movable }"
      :draggable="movable"
      @click="store.toggleCollapsed(step.instanceId)"
    >
      <span v-if="movable" class="grip" title="Drag to reorder">
        <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>
      </span>
      <span class="chev" :title="collapsed ? 'Show' : 'Hide'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="titles">
        <span class="title-line">
          <span class="step-name">{{ plugin?.label ?? step.pluginId }}</span>
          <span v-if="isSource && !isUpload" class="live-status">
            <span class="dot" />{{ camera?.isReady.value ? 'Live' : 'Connecting…' }}
          </span>
        </span>
        <span class="desc">{{ plugin?.description }}</span>
      </span>

      <!-- Source, collapsed: new snapshot / new image right from the header -->
      <button
        v-if="isSource && collapsed && isUpload"
        class="snap-btn"
        title="Choose another image"
        @click.stop="pickImage?.()"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 11V2.5M4.5 6L8 2.5 11.5 6M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Upload
      </button>
      <button
        v-else-if="isSource && collapsed"
        class="snap-btn"
        title="Use the current live picture for all steps"
        @click.stop="captureSnapshot?.()"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="4" width="13" height="9.5" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 4l1-2h3l1 2" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="8.7" r="2.4" stroke="currentColor" stroke-width="1.4"/></svg>
        Snapshot
      </button>

      <StepThumb v-if="collapsed && !isGcode" :result="result" />

      <span class="actions">
        <span v-if="isMandatory && whitelist.length <= 1" class="icon-btn static" title="Required step">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" stroke-width="1.4"/></svg>
        </span>
        <button
          v-if="isMandatory && whitelist.length > 1"
          class="icon-btn"
          title="Choose a different method"
          @click.stop="emit('replace')"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2.5 5.5h10l-3-3M13.5 10.5h-10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button
          v-else-if="canRemove"
          class="icon-btn danger"
          title="Remove step"
          @click.stop="emit('remove')"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </span>
    </div>

    <!-- Body — parameters left, view right. In fullscreen the same DOM is moved to <body>,
         so the view (canvas, 3D scene) keeps its state. -->
    <Teleport to="body" :disabled="!fullscreen">
    <div v-if="fullscreen" class="fs-backdrop" @click="exitFullscreen" />
    <div v-if="!collapsed || fullscreen" ref="rowBodyRef" class="row-body" :class="{ fs: fullscreen }">
      <div v-if="fullscreen" class="fs-head">
        <span class="fs-node">{{ step.index + 1 }}</span>
        <span class="step-name">{{ plugin?.label ?? step.pluginId }}</span>
        <span class="desc">{{ plugin?.description }}</span>
        <button class="fs-exit" title="Back to the pipeline (Esc)" @click="exitFullscreen">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Exit fullscreen
          <kbd>Esc</kbd>
        </button>
      </div>

      <div class="row-params">
        <StepParams :plugin="plugin" :values="step.values" :instance-id="step.instanceId" />
      </div>

      <div class="row-view">
        <component
          v-if="view === 'edit'"
          :is="plugin.OverlayComponent"
          :instance-id="step.instanceId"
          :step-index="step.index"
          :values="step.values"
          class="view-fill"
        />
        <BeforeAfter
          v-else-if="view === 'compare'"
          ref="viewRef"
          :before="prevResult"
          :after="result"
          :base="baseImage"
          :labels="compareLabels"
          v-model:split="splitPos"
        />
        <div v-else-if="isOutput && result" class="view-fill">
          <component
            :is="plugin.OutputComponent"
            ref="viewRef"
            :result="result"
            :mode="outputMode"
            :values="step.values"
            :step-index="step.index"
          />
        </div>

        <!-- View switch + fullscreen (top right) -->
        <div class="float-tools right">
          <!-- 3D views share one camera — this resets it for all of them -->
          <button v-if="isOutput" class="tool-btn" title="Reset the shared 3D camera" @click="viewRef?.resetView?.()">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Reset view
          </button>
          <div v-if="views.length > 1" class="segmented">
            <button
              v-for="v in views"
              :key="v.id"
              :class="{ active: v.id === view }"
              @click="selectedView = v.id"
            >{{ v.label }}</button>
          </div>
          <button
            class="tool-btn square"
            :title="fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'"
            @click="toggleFullscreen"
          >
            <svg v-if="!fullscreen" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>

        <div v-if="dimensions && !isGcode" class="dim-chip">{{ dimensions }}</div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.step-row {
  position: relative;

  // All rows share one width (parameters + picture), set by PipelineFlow as --row-w
  width: min(100%, var(--row-w, 100%));
  background: @surface2;
  border: 1px solid @hairline;
  border-radius: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:not(.collapsed) {
    border-color: fade(@border, 100%);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  }
}

// ── Rail node — sits on the line PipelineFlow draws left of the steps ─────────
// Geometry must match PipelineFlow (@gutter 68px, @rail-x 22px)
.node {
  position: absolute;
  left: calc(-68px + 22px - 20px - var(--inset, 0px));
  top: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: @mono;
  font-size: 13px;
  font-weight: 500;
  color: @muted;
  background: @panel;
  border: 1.5px solid @border;
  box-shadow: 0 0 0 6px @panel;
  z-index: 2;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  .step-row:not(.collapsed) & {
    background: @text;
    border-color: @text;
    color: @bg;
  }
}

// ── Header ────────────────────────────────────────────────────────────────────
.row-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 64px;
  padding: 0 12px 0 14px;
  cursor: pointer;
  user-select: none;
  border-radius: 14px;

  &:hover { background: fade(#fff, 2%); }
  &:hover .grip { opacity: 1; }
  .step-row:not(.collapsed) & {
    border-bottom: 1px solid @border;
    border-radius: 14px 14px 0 0;
  }
}

.step-name {
  font-size: 14px;
  font-weight: 600;
  color: @text;
  white-space: nowrap;
  flex-shrink: 0;
}

.titles {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.desc {
  font-size: 12px;
  color: @muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: @ok;
  padding: 1px 8px 1px 6px;
  border-radius: 20px;
  background: fade(@ok, 12%);
  flex-shrink: 0;

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    animation: blink 1.6s ease-in-out infinite;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: none;
  background: none;
  color: @muted;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: color 0.12s, background 0.12s;

  &:hover        { color: @text; background: @surface2; }
  &.danger:hover { color: @danger; background: fade(@danger, 12%); }
  &.static       { cursor: default; opacity: 0.6; &:hover { background: none; color: @muted; } }
}

// Collapse toggle — first thing in the header
.chev {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: @text;
  background: @surface2;
  border: 1px solid @border;
  transition: color 0.12s, border-color 0.12s, background 0.12s;

  svg { transition: transform 0.18s; }
  .collapsed & svg { transform: rotate(-90deg); }

  .row-head:hover & {
    color: @text;
    border-color: fade(#fff, 25%);
    background: fade(#fff, 6%);
  }
}

// Drag handle — the whole header drags, the dots just say so
.grip {
  position: absolute;
  left: 3px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: @muted;
  opacity: 0;
  cursor: grab;
  transition: opacity 0.12s;
}

// ── Body ──────────────────────────────────────────────────────────────────────
// Keep in sync with PARAMS_W / VIEW_H in PipelineFlow
.row-body {
  display: grid;
  grid-template-columns: 330px 1fr;
  height: 440px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 320px;
    height: auto;
  }
}

.row-params {
  padding: 16px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-right: 1px solid @border;
}

.row-view {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: 0 0 14px 0;
  background: #0e0e10;

  @media (max-width: 760px) { border-radius: 0 0 14px 14px; }
}

.view-fill {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

// ── Fullscreen ────────────────────────────────────────────────────────────────
.fs-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: fade(#000, 70%);
  backdrop-filter: blur(6px);
}

.row-body.fs {
  position: fixed;
  inset: 24px;
  z-index: 1101;
  height: auto;
  grid-template-columns: 360px 1fr;
  grid-template-rows: 64px 1fr;
  background: @surface;
  border: 1px solid @border;
  border-radius: 14px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;

  .row-view { border-radius: 0 0 14px 0; }

  @media (max-width: 760px) {
    inset: 0;
    border-radius: 0;
    grid-template-columns: 1fr;
    grid-template-rows: 56px auto 1fr;
  }
}

// In real browser fullscreen the body is the whole screen
.row-body.fs:fullscreen {
  inset: 0;
  width: 100vw;
  height: 100vh;
  border: none;
  border-radius: 0;
  box-shadow: none;

  .row-view { border-radius: 0; }
}
.row-body.fs::backdrop { background: @bg; }

.fs-exit {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 8px 0 14px;
  border: 1px solid @hairline;
  border-radius: 999px;
  background: @surface2;
  color: @text;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;

  &:hover { background: fade(#fff, 8%); }

  kbd {
    font-family: @mono;
    font-size: 10.5px;
    padding: 2px 6px;
    border-radius: 6px;
    background: @bg;
    color: @muted;
  }
}

.fs-head {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  border-bottom: 1px solid @border;
  min-width: 0;

  .desc { flex: 1; }
}

.fs-node {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  font-family: @mono;
  background: @text;
  color: @bg;
}

// ── Floating tools ────────────────────────────────────────────────────────────
.float-tools {
  position: absolute;
  top: 12px;
  display: flex;
  gap: 6px;
  z-index: 20;

  &.right { right: 12px; }
}

.segmented {
  display: flex;
  padding: 3px;
  gap: 2px;
  background: fade(#0b0d11, 80%);
  border: 1px solid fade(#fff, 8%);
  border-radius: 9px;
  backdrop-filter: blur(8px);

  button {
    background: none;
    border: none;
    border-radius: 6px;
    color: @muted;
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    padding: 5px 11px;
    cursor: pointer;
    transition: color 0.12s, background 0.12s;

    &:hover  { color: @text; }
    &.active { background: fade(#fff, 10%); color: #fff; }
  }
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  background: fade(#0b0d11, 80%);
  border: 1px solid fade(#fff, 8%);
  border-radius: 9px;
  color: @text;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: border-color 0.12s, color 0.12s;

  &:hover  { border-color: fade(#fff, 25%); color: #fff; }
  &.square { width: 34px; padding: 0; justify-content: center; }
}

// Source step, collapsed: snapshot / new image from the header (open: below the Source select)
.snap-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 32px;
  padding: 0 14px;
  background: @text;
  border: none;
  border-radius: 999px;
  color: @bg;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.12s;

  &:hover { opacity: 0.88; }
}

.dim-chip {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 10;
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: @muted;
  padding: 4px 9px;
  border-radius: 7px;
  background: fade(#0b0d11, 75%);
  backdrop-filter: blur(8px);
  pointer-events: none;
}
</style>
