<script setup>
import { ref, watchEffect, onMounted, onUnmounted } from 'vue'
import { cssColor } from '@/assets/colors.js'

/**
 * Before/after comparison of two step results on one canvas, split by a draggable divider.
 * A side is drawn from its bitmap, or — if the result carries contours — as paths on top of
 * the dimmed source image (`base`), so vector steps show where the paths lie on the photo.
 * Without `before` only the `after` side is shown.
 */
const props = defineProps({
  before: Object,   // step result or null
  after:  Object,   // step result or null
  base:   Object,   // image result the contours were traced from, or null
  labels: { type: Array, default: () => ['Before', 'After'] },
})

const containerRef = ref(null)
const canvasRef    = ref(null)

const split = defineModel('split', { default: 0.5 })   // divider position, 0..1 of the canvas width
const zoom  = ref(1)
const panX  = ref(0)
const panY  = ref(0)

function resetView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

// ── Draw ──────────────────────────────────────────────────────────────────────
/** Fit rect of a w×h raster in the canvas, including zoom and pan. */
function fitRect(w, h, cw, ch) {
  const s  = Math.min(cw / w, ch / h) * zoom.value
  const dw = w * s, dh = h * s
  return { x: (cw - dw) / 2 + panX.value, y: (ch - dh) / 2 + panY.value, s, dw, dh }
}

function drawSide(ctx, result, cw, ch, pathColor) {
  const bmp = result?.bitmap
  if (!bmp) return
  const r = fitRect(bmp.width, bmp.height, cw, ch)

  if (!result.contours) {
    ctx.drawImage(bmp, r.x, r.y, r.dw, r.dh)
    return
  }

  const baseBmp = props.base?.bitmap
  if (baseBmp) {
    ctx.globalAlpha = 0.3
    ctx.drawImage(baseBmp, r.x, r.y, r.dw, r.dh)
    ctx.globalAlpha = 1
  }

  ctx.strokeStyle = pathColor
  ctx.lineWidth   = 1.5
  ctx.lineJoin    = 'round'
  ctx.lineCap     = 'round'
  ctx.beginPath()
  for (const c of result.contours) {
    if (c.length < 2) continue
    ctx.moveTo(r.x + c[0][0] * r.s, r.y + c[0][1] * r.s)
    for (let i = 1; i < c.length; i++) ctx.lineTo(r.x + c[i][0] * r.s, r.y + c[i][1] * r.s)
  }
  ctx.stroke()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const { width: cw, height: ch } = canvas.getBoundingClientRect()
  if (!cw || !ch) return
  canvas.width  = cw
  canvas.height = ch

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = zoom.value < 2
  ctx.clearRect(0, 0, cw, ch)

  if (!props.before) {
    drawSide(ctx, props.after, cw, ch, cssColor('accent'))
    return
  }

  const sx = Math.round(split.value * cw)

  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, sx, ch); ctx.clip()
  drawSide(ctx, props.before, cw, ch, cssColor('muted'))
  ctx.restore()

  ctx.save()
  ctx.beginPath(); ctx.rect(sx, 0, cw - sx, ch); ctx.clip()
  drawSide(ctx, props.after, cw, ch, cssColor('accent'))
  ctx.restore()

  // Divider with knob
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillRect(sx - 1, 0, 2, ch)
  ctx.beginPath()
  ctx.arc(sx, ch / 2, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0e0e10'
  ctx.beginPath()
  ctx.moveTo(sx - 3, ch / 2 - 5); ctx.lineTo(sx - 8, ch / 2); ctx.lineTo(sx - 3, ch / 2 + 5)
  ctx.moveTo(sx + 3, ch / 2 - 5); ctx.lineTo(sx + 8, ch / 2); ctx.lineTo(sx + 3, ch / 2 + 5)
  ctx.fill()
}

watchEffect(draw, { flush: 'post' })

// ── Pointer ───────────────────────────────────────────────────────────────────
// Not zoomed: dragging anywhere moves the divider (easy to grab). Zoomed in: dragging pans,
// the divider still moves when grabbed directly. Same wheel rule as the 3D views: the wheel
// scrolls the page until the view has been clicked, then it zooms; a pinch always zooms.
let dragMode = null   // 'split' | 'pan' | null
let lastX = 0, lastY = 0
let engaged = false

const zoomed    = () => zoom.value > 1.001
const nearSplit = (clientX, rect) => props.before && Math.abs(clientX - rect.left - split.value * rect.width) < 16

function moveSplit(clientX, rect) {
  split.value = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
}

function onPointerDown(e) {
  if (e.button !== 0) return
  engaged = true
  const rect = canvasRef.value.getBoundingClientRect()
  dragMode = nearSplit(e.clientX, rect) ? 'split'
    : zoomed()      ? 'pan'
    : props.before  ? 'split'
    : null
  if (dragMode === 'split') moveSplit(e.clientX, rect)
  lastX = e.clientX
  lastY = e.clientY
  canvasRef.value.setPointerCapture(e.pointerId)
}

function onPointerMove(e) {
  const canvas = canvasRef.value
  const rect   = canvas.getBoundingClientRect()
  if (!dragMode) {
    canvas.style.cursor = nearSplit(e.clientX, rect) || (!zoomed() && props.before) ? 'ew-resize'
      : zoomed() ? 'grab' : 'default'
    return
  }
  if (dragMode === 'split') {
    moveSplit(e.clientX, rect)
  } else {
    panX.value += e.clientX - lastX
    panY.value += e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
  }
}

function onPointerUp() { dragMode = null }
function onPointerLeave() { if (!dragMode) engaged = false }

function onWheel(e) {
  if (!engaged && !e.ctrlKey && !e.metaKey) return   // page scrolls
  e.preventDefault()
  const rect   = canvasRef.value.getBoundingClientRect()
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  const mx     = e.clientX - rect.left - rect.width  / 2
  const my     = e.clientY - rect.top  - rect.height / 2
  panX.value = mx + (panX.value - mx) * factor
  panY.value = my + (panY.value - my) * factor
  zoom.value = Math.max(1, Math.min(zoom.value * factor, 40))
  if (!zoomed()) { panX.value = 0; panY.value = 0 }   // back at fit: centred again
}

let observer = null
onMounted(() => {
  observer = new ResizeObserver(draw)
  observer.observe(containerRef.value)
})
onUnmounted(() => observer?.disconnect())

defineExpose({ resetView })
</script>

<template>
  <div ref="containerRef" class="before-after">
    <canvas
      ref="canvasRef"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerLeave"
      @wheel="onWheel"
      @dblclick="resetView"
    />
    <template v-if="before">
      <span class="tag before" :style="{ left: `calc(${split * 100}% - 8px)` }">{{ labels[0] }}</span>
      <span class="tag after"  :style="{ left: `calc(${split * 100}% + 8px)` }">{{ labels[1] }}</span>
    </template>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.before-after {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

// Labels ride along with the divider
.tag {
  position: absolute;
  top: 14px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: fade(#0b0d11, 75%);
  backdrop-filter: blur(8px);
  padding: 4px 9px;
  border-radius: 7px;
  pointer-events: none;
  white-space: nowrap;

  &.before { transform: translateX(-100%); }
}
</style>
