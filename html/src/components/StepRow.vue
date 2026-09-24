<script setup>
import { inject, computed, ref, watch, onUnmounted } from 'vue'
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
  blockColor:  String,
  canRemove:   Boolean,
  isMandatory: Boolean,
  whitelist:   { type: Array, default: () => [] },
})

const emit = defineEmits(['remove', 'replace'])

const store           = usePipelineStore()
const stepResults     = inject('stepResults')
const camera          = inject('camera', null)
const captureSnapshot = inject('captureSnapshot', null)
const frozenBitmap    = inject('frozenBitmap', null)

const plugin   = computed(() => allPlugins.get(props.step.pluginId))
const isSource = computed(() => plugin.value?.inputType === 'none')
const isGcode  = computed(() => plugin.value?.outputType === 'gcode')

const result     = computed(() => stepResults?.value?.[props.step.index] ?? null)
const prevResult = computed(() => isSource.value ? null : stepResults?.value?.[props.step.index - 1] ?? null)

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
  if (!isGcode.value)      v.push({ id: 'compare', label: isSource.value ? 'Image' : 'Before / After' })
  if (p?.OutputComponent)  v.push({ id: 'output', label: isGcode.value ? 'Milling path' : '3D' })
  return v
})

const selectedView = ref(null)
const view = computed(() =>
  views.value.some(v => v.id === selectedView.value) ? selectedView.value : views.value[0]?.id
)

const viewRef = ref(null)

// ── Fullscreen (parameters + view) ────────────────────────────────────────────
const fullscreen = ref(false)

function onKeydown(e) {
  if (e.key === 'Escape') fullscreen.value = false
}
watch(fullscreen, on => {
  if (on) document.addEventListener('keydown', onKeydown)
  else    document.removeEventListener('keydown', onKeydown)
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

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
  <div class="step-row" :class="{ collapsed }" :style="{ '--bc': blockColor }">

    <!-- Node on the pipeline rail (drawn by PipelineFlow) -->
    <span class="node">{{ step.index + 1 }}</span>

    <!-- Header — click toggles collapse -->
    <div class="row-head" @click="store.toggleCollapsed(step.instanceId)">
      <span class="chev" :title="collapsed ? 'Show' : 'Hide'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="titles">
        <span class="title-line">
          <span class="step-name">{{ plugin?.label ?? step.pluginId }}</span>
          <span v-if="isSource" class="live-status" :class="{ captured: frozenBitmap?.value }">
            <span class="dot" />{{ frozenBitmap?.value ? 'Snapshot' : camera?.isReady.value ? 'Live' : 'Connecting…' }}
          </span>
        </span>
        <span class="desc">{{ plugin?.description }}</span>
      </span>

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
    <div v-if="fullscreen" class="fs-backdrop" @click="fullscreen = false" />
    <div v-if="!collapsed || fullscreen" class="row-body" :class="{ fs: fullscreen }" :style="{ '--bc': blockColor }">
      <div v-if="fullscreen" class="fs-head">
        <span class="fs-node">{{ step.index + 1 }}</span>
        <span class="step-name">{{ plugin?.label ?? step.pluginId }}</span>
        <span class="desc">{{ plugin?.description }}</span>
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
        />
        <div v-else-if="view === 'output' && result" class="view-fill">
          <component
            :is="plugin.OutputComponent"
            ref="viewRef"
            :result="result"
            :values="step.values"
            :step-index="step.index"
          />
        </div>

        <!-- Source controls (top left) -->
        <div v-if="isSource" class="float-tools left">
          <button class="tool-btn capture" :class="{ frozen: frozenBitmap?.value }" @click="captureSnapshot?.()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="4" width="13" height="9.5" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 4l1-2h3l1 2" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="8.7" r="2.4" stroke="currentColor" stroke-width="1.4"/></svg>
            {{ frozenBitmap?.value ? 'Retake' : 'Take snapshot' }}
          </button>
        </div>

        <!-- View switch + fullscreen (top right) -->
        <div class="float-tools right">
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
            @click="fullscreen = !fullscreen"
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
  background: @surface;
  border: 1px solid @border;
  border-radius: 12px;
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
  left: -68px + 22px - 20px;
  top: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--bc);
  background: @bg;
  border: 3px solid var(--bc);
  box-shadow: 0 0 0 5px @bg;
  z-index: 2;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;

  .step-row:not(.collapsed) & {
    background: var(--bc);
    color: #15181d;
    box-shadow: 0 0 0 5px @bg, 0 0 0 8px fade(#fff, 6%), 0 0 26px -2px var(--bc);
  }
}

// ── Header ────────────────────────────────────────────────────────────────────
.row-head {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 64px;
  padding: 0 12px 0 14px;
  cursor: pointer;
  user-select: none;
  border-radius: 12px;

  &:hover { background: fade(#fff, 2%); }
  .step-row:not(.collapsed) & {
    border-bottom: 1px solid @border;
    border-radius: 12px 12px 0 0;
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

  &.captured {
    color: @accent;
    background: fade(@accent, 12%);
    .dot { animation: none; }
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
    color: var(--bc);
    border-color: var(--bc);
    background: fade(#fff, 4%);
  }
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
  border-radius: 0 0 12px 0;
  background:
    radial-gradient(circle, fade(#fff, 5%) 1px, transparent 1.2px) 0 0 / 18px 18px,
    #101318;

  @media (max-width: 760px) { border-radius: 0 0 12px 12px; }
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
  background: var(--bc);
  color: #15181d;
}

// ── Floating tools ────────────────────────────────────────────────────────────
.float-tools {
  position: absolute;
  top: 12px;
  display: flex;
  gap: 6px;
  z-index: 20;

  &.left  { left: 12px; }
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

  &.capture        { color: #fff; background: fade(@danger, 85%); border-color: transparent; }
  &.capture:hover  { background: @danger; }
  &.capture.frozen { background: fade(#0b0d11, 80%); border-color: fade(@accent, 60%); color: @accent; }
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
