<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { makeRelief }   from '@/plugins/grbl/preview/relief.js'
import { makeCamPaths } from '@/plugins/grbl/preview/campaths.js'
import { createViewCam, fitView, resetCam, attachOrbit } from '@/plugins/grbl/preview/viewCam.js'
import { toolProfile, toolLUT, cutSegments, stamp } from '@/plugins/grbl/preview/simulate.js'

/**
 * Start page showpiece: a board with engraved nested stars (V-bit), milled with the same
 * simulation and renderers the app uses. Turns slowly until someone takes it in hand.
 */
const mode    = ref('3d')
const wrapRef = ref(null)
const reliefRef = ref(null)
const camRef    = ref(null)

const SIZE  = 100           // board, mm
const DEPTH = 1.4           // groove depth, mm
const SAFE  = 5
const TOOL  = { type: 'vee', diameter: 6, angle: 60 }
const SPIN  = 0.003         // radians per frame

// ── The toolpath ──────────────────────────────────────────────────────────────
function star(cx, cy, R, r, rot) {
  const pts = []
  for (let i = 0; i <= 10; i++) {
    const a  = rot - Math.PI / 2 + i * Math.PI / 5
    const rr = i % 2 === 0 ? R : r
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  return pts
}
function circle(cx, cy, R, n = 120) {
  const pts = []
  for (let i = 0; i <= n; i++) pts.push([cx + R * Math.cos(i / n * 2 * Math.PI), cy + R * Math.sin(i / n * 2 * Math.PI)])
  return pts
}

function buildMoves() {
  const c = SIZE / 2
  const paths = [circle(c, c, 45), circle(c, c, 42.5)]
  for (let k = 0; k < 5; k++) {
    const R = 38 - k * 7.5
    paths.push(star(c, c, R, R * 0.46, k * 9 * Math.PI / 180))
  }
  const m = [1, 0, 0, SAFE]
  for (const p of paths) {
    m.push(1, p[0][0], p[0][1], SAFE)
    m.push(0, p[0][0], p[0][1], -DEPTH)
    for (const [x, y] of p.slice(1)) m.push(0, x, y, -DEPTH)
    m.push(1, p[p.length - 1][0], p[p.length - 1][1], SAFE)
  }
  return new Float32Array(m)
}

function simulate(moves) {
  const stock = { x: 0, y: 0, w: SIZE, h: SIZE }
  const cell  = SIZE / 360
  const nx = Math.ceil(stock.w / cell) + 1, ny = Math.ceil(stock.h / cell) + 1
  const H  = new Float32Array(nx * ny)
  const tool = toolProfile(TOOL)
  stamp(H, cutSegments(moves, 0, 0), nx, ny, cell, tool.radius, toolLUT(tool))
  return { H, nx, ny, cell, stock }
}

// ── Rendering ─────────────────────────────────────────────────────────────────
const cam = createViewCam()
let relief = null, paths = null
let raf = 0, touched = false, dirty = true, drawnKey = ''
let observer = null
const detach = []

function fit() {
  const c = reliefRef.value
  fitView(cam, c.width / Math.max(1, c.height), relief.box)
  cam.dist *= 0.82      // a little closer than a plain fit — the piece should fill the card
  dirty = true
}

function loop() {
  raf = requestAnimationFrame(loop)
  if (!touched) cam.az += SPIN
  const key = `${mode.value},${cam.az},${cam.el},${cam.dist},${cam.target}`
  if (!dirty && key === drawnKey) return
  dirty = false; drawnKey = key
  ;(mode.value === 'cam' ? paths : relief).draw(cam)
}

function syncSize() {
  const el = wrapRef.value
  if (!el) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(el.clientWidth * dpr)), h = Math.max(1, Math.round(el.clientHeight * dpr))
  for (const c of [reliefRef.value, camRef.value]) if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
  dirty = true
}

onMounted(() => {
  try {
    relief = makeRelief(reliefRef.value)
    paths  = makeCamPaths(camRef.value)
  } catch { return }   // no WebGL2 — the card simply stays empty
  syncSize()
  const moves = buildMoves()
  relief.setSim(simulate(moves))
  paths.setPaths(moves, { x: 0, y: 0, w: SIZE, h: SIZE })
  cam.el = 48 * Math.PI / 180
  fit()
  observer = new ResizeObserver(syncSize)
  observer.observe(wrapRef.value)
  for (const canvas of [reliefRef.value, camRef.value]) {
    canvas.addEventListener('pointerdown', () => { touched = true })
    detach.push(attachOrbit(canvas, cam, {
      span:     () => SIZE,
      onChange: () => { touched = true; dirty = true },
      onReset:  () => { resetCam(cam); cam.el = 48 * Math.PI / 180; fit(); touched = false },
    }))
  }
  loop()
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  detach.forEach(fn => fn())
  relief?.dispose()
  paths?.dispose()
})
</script>

<template>
  <div class="hero-piece">
    <div class="tabs" role="tablist">
      <button role="tab" :aria-selected="mode === '3d'"  :class="{ on: mode === '3d' }"  @click="mode = '3d'">Milled piece</button>
      <button role="tab" :aria-selected="mode === 'cam'" :class="{ on: mode === 'cam' }" @click="mode = 'cam'">Toolpaths</button>
    </div>
    <div ref="wrapRef" class="stage">
      <canvas ref="reliefRef" v-show="mode === '3d'" />
      <canvas ref="camRef"    v-show="mode === 'cam'" />
    </div>
    <p class="hint">Drag to turn · click, then scroll to zoom</p>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.hero-piece {
  position: relative;
  border-radius: 24px;
  border: 1px solid @hairline;
  background: #0e0e10;
  overflow: hidden;
  aspect-ratio: 1 / 0.86;
}

.stage {
  position: absolute;
  inset: 0;

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
  }
}

.tabs {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 2;
  display: flex;
  padding: 3px;
  border-radius: 999px;
  background: fade(#000, 55%);
  border: 1px solid @hairline;
  backdrop-filter: blur(10px);

  button {
    border: none;
    background: none;
    color: @muted;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 999px;
    cursor: pointer;

    &.on { background: fade(#fff, 12%); color: @text; }
  }
}

.hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 14px;
  z-index: 2;
  text-align: center;
  font-size: 12px;
  color: @muted;
  pointer-events: none;
}
</style>
