<script setup>
import { inject, computed, ref, watch, nextTick } from 'vue'
import CanvasPreview from './previews/CanvasPreview.vue'
import StepParams    from './StepParams.vue'

const props = defineProps({
  stepIndex:  Number,
  instanceId: String,
  plugin:     Object,
  values:     Object,
  blockColor: String,
})

const stepResults = inject('stepResults')
const result      = computed(() => stepResults?.value?.[props.stepIndex] ?? null)

const hasHomeBtn    = computed(() => props.plugin?.outputType !== 'gcode')
const hasParamsBtn  = computed(() => (props.plugin?.params?.length ?? 0) > 0)
const hasToggle3D   = computed(() => !!(result.value?.contours?.length))

const dimensions = computed(() => {
  const r = result.value
  if (!r) return null
  const mpp = r.meta?.mmPerPixel   // mm per pixel, propagated from camera step

  if (r.kind === 'image' && r.bitmap) {
    const w = r.bitmap.width
    const h = r.bitmap.height
    if (mpp) {
      return `${(w * mpp).toFixed(1)} × ${(h * mpp).toFixed(1)} mm  (${w} × ${h} px)`
    }
    return `${w} × ${h} px`
  }
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
    if (mpp) return `${(pw * mpp).toFixed(1)} × ${(ph * mpp).toFixed(1)} mm`
    return `${Math.round(pw)} × ${Math.round(ph)} px`
  }
  return null
})

// ── Template refs for resetView ───────────────────────────────────────────────
const previewRef   = ref(null)
const previewFsRef = ref(null)

function resetView()   { previewRef.value?.resetView?.() }
function resetViewFs() { previewFsRef.value?.resetView?.() }
function toggle3D()    { previewRef.value?.toggleMode?.() }
function toggle3DFs()  { previewFsRef.value?.toggleMode?.() }

// ── Expand + settings state ───────────────────────────────────────────────────
const expanded     = ref(false)
const settingsOpen = ref(false)

watch(expanded, async (v) => {
  if (v) {
    settingsOpen.value = hasParamsBtn.value
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    if (previewRef.value?.mode === '3d') previewFsRef.value?.toggleMode?.()
  } else {
    settingsOpen.value = false
    document.removeEventListener('keydown', onKeydown)
  }
})

function onKeydown(e) {
  if (e.key === 'Escape') expanded.value = false
}
</script>

<template>
  <!-- ── Inline preview ─────────────────────────────────────────────────────── -->
  <div class="step-preview" :style="blockColor ? { '--bc': blockColor + '88' } : {}">
    <component
      v-if="plugin?.OutputComponent && result"
      ref="previewRef"
      :is="plugin.OutputComponent"
      :result="result"
      :values="values"
    />
    <CanvasPreview
      v-else-if="result?.kind === 'image'"
      ref="previewRef"
      :step-index="stepIndex"
      :is-input="false"
    />
    <div v-else class="preview-empty">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="11" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
      </svg>
    </div>

    <component
      v-if="plugin?.OverlayComponent"
      :is="plugin.OverlayComponent"
      :instance-id="instanceId"
      :step-index="stepIndex"
      :values="values"
      class="step-overlay"
    />

    <button v-if="hasToggle3D" class="preview-btn btn-toggle3d" title="Toggle 2D / 3D" @click="toggle3D">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1L11 4V8L6 11L1 8V4L6 1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M1 4L6 7L11 4M6 7V11" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
    </button>
    <button v-if="hasHomeBtn" class="preview-btn btn-home" title="Reset view" @click="resetView">⌂</button>
    <button class="preview-btn btn-expand" title="Expand" @click="expanded = true">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M1 4V1H4M7 1H10V4M10 7V10H7M4 10H1V7"
              stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="dimensions" class="preview-footer">{{ dimensions }}</div>
  </div>

  <!-- ── Fullscreen overlay ─────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="expanded" class="preview-fs-backdrop" @click.self="expanded = false" />

    <div v-if="expanded" class="preview-fs-panel"
         :style="blockColor ? { '--bc': blockColor + '88' } : {}">

      <!-- Toolbar -->
      <div class="fs-toolbar">
        <span class="fs-title">{{ plugin?.label ?? '' }}</span>

        <button v-if="hasHomeBtn" class="fs-btn" title="Reset view" @click="resetViewFs">⌂</button>
        <button v-if="hasToggle3D" class="fs-btn" title="Toggle 2D / 3D" @click="toggle3DFs">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L11 4V8L6 11L1 8V4L6 1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M1 4L6 7L11 4M6 7V11" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          </svg>
        </button>

        <button
          v-if="hasParamsBtn"
          class="fs-btn"
          :class="{ active: settingsOpen }"
          title="Toggle settings"
          @click="settingsOpen = !settingsOpen"
        >
          <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
            <line x1="1" y1="2"  x2="12" y2="2"  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="1" y1="6"  x2="12" y2="6"  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="1" y1="10" x2="12" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="4"  cy="2"  r="2" fill="currentColor"/>
            <circle cx="9"  cy="6"  r="2" fill="currentColor"/>
            <circle cx="4"  cy="10" r="2" fill="currentColor"/>
          </svg>
        </button>

        <button class="fs-btn close" title="Close (Esc)" @click="expanded = false">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Body: optional settings sidebar (left) + preview (right) -->
      <div class="fs-body">
        <!-- Settings sidebar -->
        <div v-if="settingsOpen" class="fs-settings" :style="{ '--bc': blockColor }">
          <StepParams
            :plugin="plugin"
            :values="values"
            :instance-id="instanceId"
          />
        </div>

        <div class="fs-preview">
          <component
            v-if="plugin?.OutputComponent && result"
            ref="previewFsRef"
            :is="plugin.OutputComponent"
            :result="result"
            :values="values"
          />
          <CanvasPreview
            v-else-if="result?.kind === 'image'"
            ref="previewFsRef"
            :step-index="stepIndex"
            :is-input="false"
          />
          <div v-else class="preview-empty">
            <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
            </svg>
          </div>

          <component
            v-if="plugin?.OverlayComponent"
            :is="plugin.OverlayComponent"
            :instance-id="instanceId"
            :step-index="stepIndex"
            :values="values"
            class="step-overlay"
          />

          <div v-if="dimensions" class="preview-footer">{{ dimensions }}</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

// ── Inline preview ────────────────────────────────────────────────────────────
.step-preview {
  min-width: 214px;
  max-width: 500px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #13131e;
  border: 5px solid var(--bc, #2c2c48);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  transition: opacity 0.15s, border-color 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.04) inset;
}

.step-overlay {
  position: absolute;
  inset: 0;
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: @border;
  opacity: 0.5;
}

// ── Inline buttons ────────────────────────────────────────────────────────────
.preview-btn {
  position: absolute;
  top: 10px;
  z-index: 20;
  width: 28px;
  height: 28px;
  background: rgba(16, 16, 20, 0.8);
  border: 1px solid @border;
  border-radius: 6px;
  color: @muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  padding: 0;
  font-size: 16px;
  line-height: 1;
  font-family: inherit;
  transition: color 0.15s, border-color 0.15s;

  &:hover { color: @accent; border-color: @accent; }
}

.btn-toggle3d { right: 78px; }
.btn-home     { right: 44px; }
.btn-expand   { right: 10px; }

.preview-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: @muted;
  padding: 4px 0 5px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
  pointer-events: none;
  z-index: 10;
}
</style>

<!-- Global styles for teleported fullscreen panel -->
<style lang="less">
@import '@/assets/theme.less';

.preview-fs-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
}

.preview-fs-panel {
  position: fixed;
  inset: 28px;
  z-index: 1101;
  background: @surface;
  border: 5px solid var(--bc, #2c2c48);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
.fs-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid @border;
  flex-shrink: 0;
  background: fade(#000, 12%);
}

.fs-title {
  flex: 1;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: @muted;
}

.fs-btn {
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  color: @muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  font-family: inherit;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  flex-shrink: 0;

  &:hover        { color: @accent;  border-color: @accent;  }
  &.active       { color: @accent;  border-color: @accent; background: @accent-soft; }
  &.close:hover  { color: #e05050; border-color: #e05050; }
}

// ── Body ──────────────────────────────────────────────────────────────────────
.fs-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
}

.fs-preview {
  flex: 1;
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .step-overlay {
    position: absolute;
    inset: 0;
  }
}

// ── Settings sidebar ──────────────────────────────────────────────────────────
.fs-settings {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--bc, #2c2c48);
  background: @surface2;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
