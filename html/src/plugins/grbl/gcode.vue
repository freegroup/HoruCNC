<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { makeRelief }   from './preview/relief.js'
import { makeCamPaths } from './preview/campaths.js'
import { sharedCam, fitView, resetCam, attachOrbit } from './preview/viewCam.js'
import { toolProfile, toolLUT, stockFor } from './preview/simulate.js'

/**
 * G-code result as PatternMaster shows it:
 *   3d  — the milled piece (simulated material removal, relief-raymarched)
 *   cam — the toolpaths (rapids grey, cuts cyan) inside the stock frame
 * Both share one camera, so switching keeps the view.
 */
const props = defineProps({
  result: Object,
  values: Object,
  mode:   { type: String, default: '3d' },
})

const CELL_BUDGET = 1.2e6   // height-map cells; like PatternMaster's viewer

const wrapRef   = ref(null)
const reliefRef = ref(null)
const camRef    = ref(null)
const busy      = ref(false)
const error     = ref('')

const cam = sharedCam
let relief = null, paths = null
let raf = 0, dirty = true, drawnCam = ''
let observer = null
const detach = []

const stock = computed(() => {
  const r = props.result
  if (!r?.moves) return null
  return stockFor(r.moves, (r.tool?.diameter ?? 3) / 2)
})

const sizeLabel = computed(() => stock.value
  ? `${stock.value.w.toFixed(0)} × ${stock.value.h.toFixed(0)} mm stock`
  : '')

const active = () => props.mode === 'cam' ? paths : relief

// ── Simulation (own worker, only while the 3D view is showing) ────────────────
let simWorker = null, jobId = 0, simFor = null

function simulate() {
  const r = props.result
  if (props.mode !== '3d' || !r?.moves || !relief || simFor === r) return
  simFor = r
  const tool = toolProfile(r.tool ?? { type: 'flat', diameter: 3 })
  const s    = stock.value
  const cell = Math.max(0.02, Math.sqrt(s.w * s.h / CELL_BUDGET))
  // Latest job wins: a newer result aborts a running stale one
  if (busy.value) { simWorker?.terminate(); simWorker = null }
  simWorker ??= newSimWorker()
  busy.value = true
  simWorker.postMessage({ id: ++jobId, moves: r.moves, stock: s, cell, radius: tool.radius, lut: toolLUT(tool) })
}

function newSimWorker() {
  const w = new Worker(new URL('./preview/sim.worker.js', import.meta.url), { type: 'module' })
  w.onmessage = ({ data }) => {
    if (data.id !== jobId) return
    busy.value = false
    relief.setSim(data)
    frame(relief.box)
    dirty = true
  }
  return w
}

function updatePaths() {
  const r = props.result
  if (!r?.moves || !paths) return
  paths.setPaths(r.moves, stock.value)
  frame(paths.box)
  dirty = true
}

// Fit once per project (and on reset) — a live camera must not make the view jump
function frame(box) {
  if (cam.framedFor || !box) return
  const c = reliefRef.value
  fitView(cam, c.width / Math.max(1, c.height), box)
  cam.framedFor = 'fitted'
}

function resetView() {
  resetCam(cam)
  frame(active()?.box)
  dirty = true
}

// ── Render loop ───────────────────────────────────────────────────────────────
function loop() {
  raf = requestAnimationFrame(loop)
  const camKey = `${cam.az},${cam.el},${cam.dist},${cam.target}`
  if (!dirty && camKey === drawnCam) return
  dirty = false; drawnCam = camKey
  active()?.draw(cam)
}

function syncSize() {
  const el = wrapRef.value
  if (!el) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(el.clientWidth * dpr)), h = Math.max(1, Math.round(el.clientHeight * dpr))
  for (const c of [reliefRef.value, camRef.value]) {
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
  }
  dirty = true
}

watch(() => props.result, () => { updatePaths(); simulate() })
watch(() => props.mode, () => { simulate(); frame(active()?.box); dirty = true })

onMounted(() => {
  try {
    relief = makeRelief(reliefRef.value)
    paths  = makeCamPaths(camRef.value)
  } catch (e) {
    error.value = e.message
    return
  }
  syncSize()
  observer = new ResizeObserver(syncSize)
  observer.observe(wrapRef.value)
  for (const [canvas, r] of [[reliefRef.value, relief], [camRef.value, paths]]) {
    detach.push(attachOrbit(canvas, cam, {
      span:     () => { const b = r.box; return b ? Math.max(b[3] - b[0], b[4] - b[1]) : 10 },
      onChange: () => { dirty = true },
      onReset:  resetView,
    }))
  }
  updatePaths()
  simulate()
  loop()
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  detach.forEach(fn => fn())
  simWorker?.terminate()
  relief?.dispose()
  paths?.dispose()
})

defineExpose({ resetView })
</script>

<template>
  <div class="gcode-preview">
    <div ref="wrapRef" class="viewport">
      <canvas ref="reliefRef" v-show="mode !== 'cam'" />
      <canvas ref="camRef"    v-show="mode === 'cam'" />
      <div v-if="error" class="msg">{{ error }}</div>
      <div v-else-if="busy && mode !== 'cam'" class="msg busy">Milling…</div>
    </div>
    <div class="footer">
      <span v-if="mode === 'cam'" class="legend">
        <span class="line cutting" /> cutting
        <span class="line rapid" /> rapid
        <span class="line stock" /> stock
      </span>
      <span v-else class="legend">{{ sizeLabel }}</span>
      <span class="hint">drag: rotate · shift-drag: pan · click, then wheel: zoom · double-click: reset</span>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.gcode-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  background: #0e0e10;

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
  }
}

.msg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: @muted;
  font-size: 12px;
  pointer-events: none;

  &.busy {
    inset: auto 10px 10px auto;
    padding: 3px 8px;
    border-radius: 4px;
    background: fade(@bg, 80%);
  }
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px;
  font-size: 11px;
  color: @muted;
  border-top: 1px solid @border;
}

.legend {
  display: flex;
  align-items: center;
  gap: 6px;
}

.line {
  display: inline-block;
  width: 14px;
  height: 3px;
  border-radius: 2px;
  margin-left: 6px;

  &.cutting { background: @accent; }
  &.rapid   { background: #9ea8b8; }
  &.stock   { background: #737780; }
}

.hint { opacity: 0.7; text-align: right; }
</style>
