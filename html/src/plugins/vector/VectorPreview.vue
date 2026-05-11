<script setup>
/**
 * Vector-aware canvas preview.
 * Renders contour paths directly via Canvas 2D — stays crisp at any zoom level.
 *
 * Dual interface:
 *   OutputComponent  → receives :result prop (the current step result)
 *   InputComponent   → receives :step-index, injects stepResults, reads index-1
 */
import { ref, computed, inject, watchEffect, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  result:    Object,   // OutputComponent path
  values:    Object,   // InputComponent path (not used for drawing)
  stepIndex: Number,   // InputComponent path
})

const canvasRef   = ref(null)
const stepResults = inject('stepResults', null)

// Resolve which step result to show
const activeResult = computed(() => {
  if (props.result !== undefined) return props.result
  const idx = (props.stepIndex ?? 0) - 1
  return stepResults?.value?.[idx] ?? null
})

// ── View state ────────────────────────────────────────────────────────────────
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)

function resetView() { zoom.value = 1; panX.value = 0; panY.value = 0; draw() }

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw() {
  const canvas = canvasRef.value
  const result = activeResult.value
  if (!canvas || !result) return

  const contours = result.contours
  if (!contours?.length) return

  const iw = result.bitmap?.width  || 640
  const ih = result.bitmap?.height || 480

  const { width, height } = canvas.getBoundingClientRect()
  if (!width || !height) return

  canvas.width  = width
  canvas.height = height

  const ctx  = canvas.getContext('2d')
  const base = Math.min(width / iw, height / ih)   // fit-to-canvas scale at zoom=1
  const s    = zoom.value * base                    // total canvas scale factor

  ctx.fillStyle = '#0a0a10'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(width / 2 + panX.value, height / 2 + panY.value)
  ctx.scale(s, s)

  // All coordinates are shifted so that image centre = canvas centre
  const ox = iw / 2
  const oy = ih / 2

  // Contour lines — always 1 px on screen
  ctx.strokeStyle = '#f0a030'
  ctx.lineWidth   = 1 / s
  ctx.lineJoin    = 'round'
  ctx.lineCap     = 'round'

  for (const contour of contours) {
    if (contour.length < 2) continue
    ctx.beginPath()
    ctx.moveTo(contour[0][0] - ox, contour[0][1] - oy)
    for (let i = 1; i < contour.length; i++) {
      ctx.lineTo(contour[i][0] - ox, contour[i][1] - oy)
    }
    ctx.stroke()
  }

  ctx.restore()
}

watchEffect(draw, { flush: 'post' })

// ── Wheel zoom toward cursor ──────────────────────────────────────────────────
function onWheel(e) {
  if (!e.ctrlKey && !e.metaKey) return   // no modifier → let parent scroll
  e.preventDefault()
  const canvas = canvasRef.value
  if (!canvas) return
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  const rect   = canvas.getBoundingClientRect()
  const mx     = e.clientX - rect.left - rect.width  / 2
  const my     = e.clientY - rect.top  - rect.height / 2
  panX.value = mx + (panX.value - mx) * factor
  panY.value = my + (panY.value - my) * factor
  zoom.value = Math.max(0.05, Math.min(zoom.value * factor, 100))
  draw()
}

// ── Mouse drag pan ────────────────────────────────────────────────────────────
let dragging = false, lastMX = 0, lastMY = 0

function onMouseDown(e) { if (e.button === 0) { dragging = true; lastMX = e.clientX; lastMY = e.clientY } }
function onMouseMove(e) {
  if (!dragging) return
  panX.value += e.clientX - lastMX
  panY.value += e.clientY - lastMY
  lastMX = e.clientX; lastMY = e.clientY
  draw()
}
function onMouseUp() { dragging = false }

// ── Touch pinch+drag ──────────────────────────────────────────────────────────
let lastTouchDist = 0, lastTouchMX = 0, lastTouchMY = 0
const tdist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
const tmid  = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 })

function onTouchStart(e) {
  if (e.touches.length === 2) { lastTouchDist = tdist(e.touches); const m = tmid(e.touches); lastTouchMX = m.x; lastTouchMY = m.y }
  else { lastTouchMX = e.touches[0].clientX; lastTouchMY = e.touches[0].clientY }
}
function onTouchMove(e) {
  e.preventDefault()
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  if (e.touches.length === 2) {
    const d = tdist(e.touches), m = tmid(e.touches), f = d / lastTouchDist
    const mx = m.x - rect.left - rect.width / 2, my = m.y - rect.top - rect.height / 2
    panX.value = mx + (panX.value - mx) * f + (m.x - lastTouchMX)
    panY.value = my + (panY.value - my) * f + (m.y - lastTouchMY)
    zoom.value = Math.max(0.05, Math.min(zoom.value * f, 100))
    lastTouchDist = d; lastTouchMX = m.x; lastTouchMY = m.y
  } else {
    panX.value += e.touches[0].clientX - lastTouchMX
    panY.value += e.touches[0].clientY - lastTouchMY
    lastTouchMX = e.touches[0].clientX; lastTouchMY = e.touches[0].clientY
  }
  draw()
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let observer = null
onMounted(() => {
  const c = canvasRef.value
  c.addEventListener('wheel',      onWheel,      { passive: false })
  c.addEventListener('mousedown',  onMouseDown)
  c.addEventListener('touchstart', onTouchStart, { passive: true })
  c.addEventListener('touchmove',  onTouchMove,  { passive: false })
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup',   onMouseUp)
  observer = new ResizeObserver(draw)
  observer.observe(c)
})
onUnmounted(() => {
  const c = canvasRef.value
  c?.removeEventListener('wheel',      onWheel)
  c?.removeEventListener('mousedown',  onMouseDown)
  c?.removeEventListener('touchstart', onTouchStart)
  c?.removeEventListener('touchmove',  onTouchMove)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',   onMouseUp)
  observer?.disconnect()
})

defineExpose({ resetView })
</script>

<template>
  <div class="vector-wrap">
    <canvas ref="canvasRef" class="vector-canvas" :class="{ dragging }" />
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.vector-wrap {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.vector-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  &.dragging { cursor: grabbing; }
}

</style>
