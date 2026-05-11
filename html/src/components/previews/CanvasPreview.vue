<script setup>
import { ref, inject, watchEffect, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  stepIndex: Number,
  isInput:   Boolean,
})

const containerRef = ref(null)
const canvasRef    = ref(null)
const stepResults  = inject('stepResults')

// ── View state ────────────────────────────────────────────────────────────────
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)

function resetView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  draw()
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw() {
  const canvas  = canvasRef.value
  const results = stepResults?.value
  if (!canvas || !results) return

  const idx = props.isInput ? props.stepIndex - 1 : props.stepIndex
  if (idx === undefined || idx < 0 || idx >= results.length) return

  const result = results[idx]
  if (!result || result.kind !== 'image') return

  const bmp = result.bitmap
  const { width, height } = canvas.getBoundingClientRect()
  if (!width || !height) return

  canvas.width  = width
  canvas.height = height

  // Base fit-scale (zoom=1 fits image to canvas)
  const base = Math.min(width / bmp.width, height / bmp.height)
  const dw   = bmp.width  * base
  const dh   = bmp.height * base

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(width / 2 + panX.value, height / 2 + panY.value)
  ctx.scale(zoom.value, zoom.value)
  ctx.drawImage(bmp, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

watchEffect(draw, { flush: 'post' })

// ── Mouse wheel zoom toward cursor ────────────────────────────────────────────
function onWheel(e) {
  if (!e.ctrlKey && !e.metaKey) return   // no modifier → let parent scroll
  e.preventDefault()
  const canvas = canvasRef.value
  if (!canvas) return

  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  const rect   = canvas.getBoundingClientRect()
  const mx     = e.clientX - rect.left - rect.width  / 2
  const my     = e.clientY - rect.top  - rect.height / 2

  // Zoom toward cursor: keep point under cursor fixed
  panX.value = mx + (panX.value - mx) * factor
  panY.value = my + (panY.value - my) * factor
  zoom.value = Math.max(0.05, Math.min(zoom.value * factor, 50))
  draw()
}

// ── Mouse drag pan ────────────────────────────────────────────────────────────
let dragging = false
let lastMX   = 0
let lastMY   = 0

function onMouseDown(e) {
  if (e.button !== 0) return
  dragging = true
  lastMX = e.clientX
  lastMY = e.clientY
}

function onMouseMove(e) {
  if (!dragging) return
  panX.value += e.clientX - lastMX
  panY.value += e.clientY - lastMY
  lastMX = e.clientX
  lastMY = e.clientY
  draw()
}

function onMouseUp() { dragging = false }

// ── Touch: pinch zoom + drag ──────────────────────────────────────────────────
let lastTouchDist = 0
let lastTouchMX   = 0
let lastTouchMY   = 0

const dist = (t) => {
  const dx = t[0].clientX - t[1].clientX
  const dy = t[0].clientY - t[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}
const mid = (t) => ({
  x: (t[0].clientX + t[1].clientX) / 2,
  y: (t[0].clientY + t[1].clientY) / 2,
})

function onTouchStart(e) {
  if (e.touches.length === 2) {
    lastTouchDist = dist(e.touches)
    const m = mid(e.touches); lastTouchMX = m.x; lastTouchMY = m.y
  } else {
    lastTouchMX = e.touches[0].clientX
    lastTouchMY = e.touches[0].clientY
  }
}

function onTouchMove(e) {
  e.preventDefault()
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()

  if (e.touches.length === 2) {
    const d      = dist(e.touches)
    const m      = mid(e.touches)
    const factor = d / lastTouchDist
    const mx     = m.x - rect.left - rect.width  / 2
    const my     = m.y - rect.top  - rect.height / 2

    panX.value = mx + (panX.value - mx) * factor + (m.x - lastTouchMX)
    panY.value = my + (panY.value - my) * factor + (m.y - lastTouchMY)
    zoom.value = Math.max(0.05, Math.min(zoom.value * factor, 50))

    lastTouchDist = d; lastTouchMX = m.x; lastTouchMY = m.y
  } else {
    panX.value += e.touches[0].clientX - lastTouchMX
    panY.value += e.touches[0].clientY - lastTouchMY
    lastTouchMX = e.touches[0].clientX
    lastTouchMY = e.touches[0].clientY
  }
  draw()
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let observer = null

onMounted(() => {
  const canvas = canvasRef.value
  canvas.addEventListener('wheel',      onWheel,      { passive: false })
  canvas.addEventListener('mousedown',  onMouseDown)
  canvas.addEventListener('touchstart', onTouchStart, { passive: true  })
  canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
  window.addEventListener('mousemove',  onMouseMove)
  window.addEventListener('mouseup',    onMouseUp)

  observer = new ResizeObserver(draw)
  observer.observe(canvas)
})

onUnmounted(() => {
  const canvas = canvasRef.value
  canvas?.removeEventListener('wheel',      onWheel)
  canvas?.removeEventListener('mousedown',  onMouseDown)
  canvas?.removeEventListener('touchstart', onTouchStart)
  canvas?.removeEventListener('touchmove',  onTouchMove)
  window.removeEventListener('mousemove',   onMouseMove)
  window.removeEventListener('mouseup',     onMouseUp)
  observer?.disconnect()
})

defineExpose({ resetView })
</script>

<template>
  <div ref="containerRef" class="canvas-wrap">
    <canvas ref="canvasRef" class="canvas-preview" :class="{ dragging }" />
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.canvas-wrap {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.canvas-preview {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  &.dragging { cursor: grabbing; }
}

</style>
