<script setup>
import { ref, computed, inject, watchEffect, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  result:    Object,
  values:    Object,
  stepIndex: Number,
})

const canvasRef    = ref(null)
const containerRef = ref(null)
const wrapRef      = ref(null)
const mode         = ref('2d')
const lockedSize   = ref(null)
const stepResults  = inject('stepResults', null)

const activeResult = computed(() => {
  if (props.result !== undefined) return props.result
  const idx = (props.stepIndex ?? 0) - 1
  return stepResults?.value?.[idx] ?? null
})

// ── Z helpers ─────────────────────────────────────────────────────────────────
function getZMax(contours) {
  let zMax = 0
  for (const c of contours)
    for (const p of c) {
      const z = p[2]
      if (Number.isFinite(z) && z > zMax) zMax = z
    }
  return zMax
}

// Map t ∈ [0,1] (0=surface, 1=max depth) to CSS color string
function zColorCss(t) {
  const tc = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0
  const h = Math.round(30 + 170 * (1 - tc))   // orange (30°) → blue (200°)
  const l = Math.round(35 + 30  * tc)
  return `hsl(${h},90%,${l}%)`
}

// ── 2D ────────────────────────────────────────────────────────────────────────
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)

function resetView() { zoom.value = 1; panX.value = 0; panY.value = 0; draw() }

function draw() {
  if (mode.value !== '2d') return
  const canvas = canvasRef.value
  const result = activeResult.value
  if (!canvas || !result?.contours?.length) return

  const contours = result.contours
  const iw = result.bitmap?.width  || 640
  const ih = result.bitmap?.height || 480
  const { width, height } = canvas.getBoundingClientRect()
  if (!width || !height) return

  canvas.width  = width
  canvas.height = height

  const ctx  = canvas.getContext('2d')
  const base = Math.min(width / iw, height / ih)
  const s    = zoom.value * base

  ctx.fillStyle = '#0a0a10'
  ctx.fillRect(0, 0, width, height)
  ctx.save()
  ctx.translate(width / 2 + panX.value, height / 2 + panY.value)
  ctx.scale(s, s)

  const ox   = iw / 2
  const oy   = ih / 2
  const zMax  = getZMax(contours)
  const has3D = zMax > 0

  ctx.lineWidth = 1 / s
  ctx.lineJoin  = 'round'
  ctx.lineCap   = 'round'

  for (const contour of contours) {
    if (contour.length < 2) continue

    if (!has3D) {
      ctx.strokeStyle = '#f0a030'
      ctx.beginPath()
      ctx.moveTo(contour[0][0] - ox, contour[0][1] - oy)
      for (let i = 1; i < contour.length; i++)
        ctx.lineTo(contour[i][0] - ox, contour[i][1] - oy)
      ctx.stroke()
    } else {
      // Per-segment gradient: fade from point[i-1] color to point[i] color
      for (let i = 1; i < contour.length; i++) {
        const x1 = contour[i-1][0] - ox,  y1 = contour[i-1][1] - oy
        const x2 = contour[i][0]   - ox,  y2 = contour[i][1]   - oy
        const t1 = (contour[i-1][2] ?? 0) / zMax
        const t2 = (contour[i][2]   ?? 0) / zMax

        if (Math.abs(t1 - t2) < 0.01) {
          // Same depth — single color, no gradient needed
          ctx.strokeStyle = zColorCss((t1 + t2) / 2)
        } else {
          const grad = ctx.createLinearGradient(x1, y1, x2, y2)
          grad.addColorStop(0, zColorCss(t1))
          grad.addColorStop(1, zColorCss(t2))
          ctx.strokeStyle = grad
        }

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }
  }

  ctx.restore()
}

watchEffect(draw, { flush: 'post' })

// ── Wheel zoom ────────────────────────────────────────────────────────────────
function onWheel(e) {
  if (mode.value !== '2d') return
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const canvas = canvasRef.value
  if (!canvas) return
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  const rect   = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left - rect.width  / 2
  const my = e.clientY - rect.top  - rect.height / 2
  panX.value = mx + (panX.value - mx) * factor
  panY.value = my + (panY.value - my) * factor
  zoom.value = Math.max(0.05, Math.min(zoom.value * factor, 100))
  draw()
}

// ── Mouse drag ────────────────────────────────────────────────────────────────
let dragging = false, lastMX = 0, lastMY = 0

function onMouseDown(e) {
  if (e.button === 0) { dragging = true; lastMX = e.clientX; lastMY = e.clientY }
}
function onMouseMove(e) {
  if (!dragging || mode.value !== '2d') return
  panX.value += e.clientX - lastMX
  panY.value += e.clientY - lastMY
  lastMX = e.clientX; lastMY = e.clientY
  draw()
}
function onMouseUp() { dragging = false }

// ── Touch ─────────────────────────────────────────────────────────────────────
let lastTouchDist = 0, lastTouchMX = 0, lastTouchMY = 0
const tdist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
const tmid  = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 })

function onTouchStart(e) {
  if (e.touches.length === 2) { lastTouchDist = tdist(e.touches); const m = tmid(e.touches); lastTouchMX = m.x; lastTouchMY = m.y }
  else { lastTouchMX = e.touches[0].clientX; lastTouchMY = e.touches[0].clientY }
}
function onTouchMove(e) {
  if (mode.value !== '2d') return
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

// ── 3D (Three.js) ─────────────────────────────────────────────────────────────
let THREE    = null
let renderer = null
let scene    = null
let camera   = null
let controls = null
let animId   = null
let observer3D = null

const HOME = {
  direction: { x: -0.17, y: -0.86, z: 0.48 },
  up:        { x:  0.12, y:  0.97, z: 0.22 },
}

async function init3D() {
  const el = containerRef.value
  if (!el) return

  const [threeModule, { TrackballControls }] = await Promise.all([
    import('three'),
    import('three/addons/controls/TrackballControls.js'),
  ])
  THREE = threeModule

  const w = el.clientWidth
  const h = el.clientHeight

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(w, h, false)   // false = don't override CSS with explicit px
  renderer.setClearColor(0x0a0a10)
  Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' })
  el.appendChild(renderer.domElement)

  renderer.domElement.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation()
  }, { capture: false })

  scene  = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 100000)

  controls = new TrackballControls(camera, renderer.domElement)
  controls.rotateSpeed  = 5
  controls.zoomSpeed    = 1.2
  controls.panSpeed     = 0.8
  controls.staticMoving = true

  build3DScene()

  const animate = () => {
    animId = requestAnimationFrame(animate)
    controls?.update()
    renderer?.render(scene, camera)
  }
  animate()

  observer3D = new ResizeObserver(() => {
    const w = el.clientWidth, h = el.clientHeight
    if (!w || !h) return
    renderer?.setSize(w, h, false)
    if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix() }
    controls?.handleResize()
  })
  observer3D.observe(el)
}

function build3DScene() {
  if (!THREE || !scene) return

  // Dispose previous objects
  scene.traverse(obj => {
    obj.geometry?.dispose()
    if (obj.material && !Array.isArray(obj.material)) obj.material.dispose()
  })
  while (scene.children.length) scene.remove(scene.children[0])

  const result   = activeResult.value
  const contours = result?.contours ?? []
  if (!contours.length) return

  const iw         = result.bitmap?.width  || 640
  const ih         = result.bitmap?.height || 480
  const mmPerPixel = result.meta?.mmPerPixel ?? 0.264583
  const zMax       = getZMax(contours)

  const group = new THREE.Group()

  for (const contour of contours) {
    if (contour.length < 2) continue

    const positions = []
    const colors    = []

    for (const [px, py, pz = 0] of contour) {
      positions.push(px * mmPerPixel, (ih - py) * mmPerPixel, pz)

      // Vertex color: same hue logic as 2D, Three.js interpolates between vertices
      const t = (zMax === 0 || !Number.isFinite(pz)) ? 0 : Math.max(0, Math.min(1, pz / zMax))
      const color = new THREE.Color().setHSL((30 + 170 * (1 - t)) / 360, 0.9, 0.35 + 0.30 * t)
      colors.push(color.r, color.g, color.b)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3))
    group.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true })))
  }

  scene.add(group)

  const box      = new THREE.Box3().setFromObject(group)
  const center   = box.getCenter(new THREE.Vector3())
  const size     = box.getSize(new THREE.Vector3())
  const maxLen   = Math.max(size.x, size.y, Math.abs(size.z ?? 0), 1)
  const gridSize = Math.max(size.x, size.y) * 1.3

  scene.add(new THREE.AxesHelper(maxLen * 0.4))

  const grid = new THREE.GridHelper(gridSize, 12, 0x333344, 0x222233)
  grid.rotation.x = Math.PI / 2
  grid.position.set(center.x, center.y, 0)
  scene.add(grid)

  // Fit camera
  const fov  = camera.fov * (Math.PI / 180)
  const dist = (maxLen / 2) / Math.tan(fov / 2) * 1.6
  camera.near = dist / 100
  camera.far  = dist * 100
  camera.updateProjectionMatrix()
  camera.up.set(HOME.up.x, HOME.up.y, HOME.up.z)
  camera.position.set(
    center.x + HOME.direction.x * dist,
    center.y + HOME.direction.y * dist,
    center.z + HOME.direction.z * dist,
  )
  controls.target.copy(center)
  controls.update()
}

function dispose3D() {
  cancelAnimationFrame(animId); animId = null
  observer3D?.disconnect(); observer3D = null
  controls?.dispose()
  scene?.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose() })
  renderer?.dispose()
  renderer?.domElement?.remove()
  renderer = null; scene = null; camera = null; controls = null; THREE = null
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
async function toggleMode() {
  if (mode.value === '2d') {
    // Lock current pixel size so the container doesn't collapse when the canvas hides
    const el = wrapRef.value
    if (el) lockedSize.value = { width: el.offsetWidth + 'px', height: el.offsetHeight + 'px' }
    mode.value = '3d'
    await nextTick()
    await init3D()
  } else {
    dispose3D()
    mode.value = '2d'
    lockedSize.value = null
    await nextTick()
    draw()
  }
}

watch(activeResult, () => {
  if (mode.value === '3d' && scene) build3DScene()
}, { flush: 'post' })

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let observer2D = null

onMounted(() => {
  const c = canvasRef.value
  c.addEventListener('wheel',      onWheel,      { passive: false })
  c.addEventListener('mousedown',  onMouseDown)
  c.addEventListener('touchstart', onTouchStart, { passive: true })
  c.addEventListener('touchmove',  onTouchMove,  { passive: false })
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup',   onMouseUp)
  observer2D = new ResizeObserver(draw)
  observer2D.observe(c)
})

onUnmounted(() => {
  const c = canvasRef.value
  c?.removeEventListener('wheel',      onWheel)
  c?.removeEventListener('mousedown',  onMouseDown)
  c?.removeEventListener('touchstart', onTouchStart)
  c?.removeEventListener('touchmove',  onTouchMove)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',   onMouseUp)
  observer2D?.disconnect()
  if (mode.value === '3d') dispose3D()
})

defineExpose({ resetView, toggleMode, mode })
</script>

<template>
  <div ref="wrapRef" class="vector-wrap" :style="lockedSize">
    <canvas
      ref="canvasRef"
      class="vector-canvas"
      :class="{ dragging }"
      v-show="mode === '2d'"
    />
    <div ref="containerRef" class="three-container" v-show="mode === '3d'" />
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

.vector-canvas,
.three-container {
  width: 100%;
  height: 100%;
  display: block;
}

.vector-canvas {
  cursor: grab;
  &.dragging { cursor: grabbing; }
}

.three-container {
  cursor: grab;
  &:active { cursor: grabbing; }
}
</style>
