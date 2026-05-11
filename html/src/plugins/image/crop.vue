<script setup>
import { ref, inject, watchEffect, onMounted, onUnmounted } from 'vue'
import { usePipelineStore } from '@/stores/pipeline.js'

const props = defineProps({
  values:     Object,
  stepIndex:  Number,
  instanceId: String,
})

const store       = usePipelineStore()
const canvasRef   = ref(null)
const stepResults = inject('stepResults')
let observer      = null

// Image layout — updated on every draw, read by pointer handlers
let imgBounds = { x0: 0, y0: 0, dw: 1, dh: 1 }
let dragKey   = null

// ── Draw ───────────────────────────────────────────────────────────────────────
function draw() {
  const canvas  = canvasRef.value
  const results = stepResults?.value
  if (!canvas || !results) return

  const idx = (props.stepIndex ?? 0) - 1
  if (idx < 0 || idx >= results.length) return

  const result = results[idx]
  if (!result || result.kind !== 'image') return

  const bmp = result.bitmap
  const { width, height } = canvas.getBoundingClientRect()
  if (!width || !height) return

  canvas.width  = width
  canvas.height = height

  const base = Math.min(width / bmp.width, height / bmp.height)
  const dw   = bmp.width  * base
  const dh   = bmp.height * base
  const x0   = (width  - dw) / 2
  const y0   = (height - dh) / 2

  imgBounds = { x0, y0, dw, dh }

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bmp, x0, y0, dw, dh)

  const l = (props.values?.leftCut   ?? 0) / 100
  const r = (props.values?.rightCut  ?? 0) / 100
  const t = (props.values?.topCut    ?? 0) / 100
  const b = (props.values?.bottomCut ?? 0) / 100

  const xl = x0 +             l * dw
  const xr = x0 + (1 - r)   * dw
  const yt = y0 +             t * dh
  const yb = y0 + (1 - b)   * dh

  // Dim cropped strips
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  if (l > 0) ctx.fillRect(x0, y0,  l * dw,       dh)
  if (r > 0) ctx.fillRect(xr, y0,  r * dw,       dh)
  if (t > 0) ctx.fillRect(xl, y0,  xr - xl,  t * dh)
  if (b > 0) ctx.fillRect(xl, yb,  xr - xl,  b * dh)

  // Crop lines — all 4 always drawn so they're always draggable
  const lines = [
    { key: 'leftCut',   x1: xl, y1: y0,       x2: xl, y2: y0 + dh },
    { key: 'rightCut',  x1: xr, y1: y0,       x2: xr, y2: y0 + dh },
    { key: 'topCut',    x1: xl, y1: yt,       x2: xr, y2: yt      },
    { key: 'bottomCut', x1: xl, y1: yb,       x2: xr, y2: yb      },
  ]
  ctx.setLineDash([5, 4])
  for (const ln of lines) {
    const active = dragKey === ln.key
    ctx.strokeStyle = active ? '#ffffff' : '#f0a030'
    ctx.lineWidth   = active ? 2.5 : 1.5
    ctx.globalAlpha = active ? 1.0 : 0.8
    ctx.beginPath()
    ctx.moveTo(ln.x1, ln.y1)
    ctx.lineTo(ln.x2, ln.y2)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  // Midpoint drag handles
  const handles = [
    { key: 'leftCut',   cx: xl,          cy: y0 + dh / 2 },
    { key: 'rightCut',  cx: xr,          cy: y0 + dh / 2 },
    { key: 'topCut',    cx: x0 + dw / 2, cy: yt           },
    { key: 'bottomCut', cx: x0 + dw / 2, cy: yb           },
  ]
  for (const h of handles) {
    const active = dragKey === h.key
    ctx.fillStyle   = active ? '#ffffff' : '#f0a030'
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.arc(h.cx, h.cy, active ? 6 : 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

watchEffect(draw, { flush: 'post' })

// ── Pointer helpers ────────────────────────────────────────────────────────────
const HIT = 10

function lineHitTest(cx, cy) {
  const { x0, y0, dw, dh } = imgBounds
  const v  = props.values ?? {}
  const xl = x0 +                                (v.leftCut   ?? 0) / 100 * dw
  const xr = x0 + (1 - (v.rightCut  ?? 0) / 100) * dw
  const yt = y0 +                                (v.topCut    ?? 0) / 100 * dh
  const yb = y0 + (1 - (v.bottomCut ?? 0) / 100) * dh

  if (Math.abs(cx - xl) < HIT && cy >= y0 - HIT && cy <= y0 + dh + HIT) return 'leftCut'
  if (Math.abs(cx - xr) < HIT && cy >= y0 - HIT && cy <= y0 + dh + HIT) return 'rightCut'
  if (Math.abs(cy - yt) < HIT && cx >= x0 - HIT && cx <= x0 + dw + HIT) return 'topCut'
  if (Math.abs(cy - yb) < HIT && cx >= x0 - HIT && cx <= x0 + dw + HIT) return 'bottomCut'
  return null
}

function canvasXY(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  const src  = e.touches ? e.touches[0] : e
  return [src.clientX - rect.left, src.clientY - rect.top]
}

function applyDrag(cx, cy) {
  const { x0, y0, dw, dh } = imgBounds
  const v = props.values ?? {}

  // Minimum gap in % — keeps lines at least 10 display-px apart from opposite
  const gapH = 10 / dw * 100
  const gapV = 10 / dh * 100

  let pct
  if (dragKey === 'leftCut') {
    pct = (cx - x0) / dw * 100
    pct = Math.max(0, Math.min(100 - (v.rightCut ?? 0) - gapH, pct))
  } else if (dragKey === 'rightCut') {
    pct = (x0 + dw - cx) / dw * 100
    pct = Math.max(0, Math.min(100 - (v.leftCut ?? 0) - gapH, pct))
  } else if (dragKey === 'topCut') {
    pct = (cy - y0) / dh * 100
    pct = Math.max(0, Math.min(100 - (v.bottomCut ?? 0) - gapV, pct))
  } else if (dragKey === 'bottomCut') {
    pct = (y0 + dh - cy) / dh * 100
    pct = Math.max(0, Math.min(100 - (v.topCut ?? 0) - gapV, pct))
  }
  store.updateStepParam(props.instanceId, dragKey, Math.round(pct))
}

// ── Mouse events ───────────────────────────────────────────────────────────────
function onMouseDown(e) {
  if (e.button !== 0) return
  const [cx, cy] = canvasXY(e)
  const hit = lineHitTest(cx, cy)
  if (hit) { dragKey = hit; e.preventDefault(); draw() }
}

function onMouseMove(e) {
  const [cx, cy] = canvasXY(e)
  if (dragKey) { applyDrag(cx, cy); return }

  const hit = lineHitTest(cx, cy)
  const c   = canvasRef.value
  if (!c) return
  if      (hit === 'leftCut'  || hit === 'rightCut')  c.style.cursor = 'col-resize'
  else if (hit === 'topCut'   || hit === 'bottomCut') c.style.cursor = 'row-resize'
  else                                                 c.style.cursor = 'default'
}

function onMouseUp() {
  if (dragKey) { dragKey = null; draw() }
}

// ── Touch events ───────────────────────────────────────────────────────────────
function onTouchStart(e) {
  const [cx, cy] = canvasXY(e)
  const hit = lineHitTest(cx, cy)
  if (hit) { dragKey = hit; e.preventDefault(); draw() }
}

function onTouchMove(e) {
  if (!dragKey) return
  e.preventDefault()
  applyDrag(...canvasXY(e))
}

function onTouchEnd() {
  if (dragKey) { dragKey = null; draw() }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(() => {
  const c = canvasRef.value
  observer = new ResizeObserver(draw)
  observer.observe(c)
  c.addEventListener('mousedown',  onMouseDown)
  c.addEventListener('touchstart', onTouchStart, { passive: false })
  c.addEventListener('touchmove',  onTouchMove,  { passive: false })
  c.addEventListener('touchend',   onTouchEnd)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup',   onMouseUp)
})

onUnmounted(() => {
  observer?.disconnect()
  const c = canvasRef.value
  c?.removeEventListener('mousedown',  onMouseDown)
  c?.removeEventListener('touchstart', onTouchStart)
  c?.removeEventListener('touchmove',  onTouchMove)
  c?.removeEventListener('touchend',   onTouchEnd)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',   onMouseUp)
})
</script>

<template>
  <canvas ref="canvasRef" class="crop-overlay" />
</template>

<style lang="less" scoped>
.crop-overlay {
  width: 100%;
  height: 100%;
  display: block;
  cursor: default;
}
</style>
