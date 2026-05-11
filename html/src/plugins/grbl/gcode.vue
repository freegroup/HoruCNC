<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({ result: Object, values: Object })

// ── Home view — angle only, distance is computed from bounding box ─────────────
const HOME = {
  direction: { x: -0.1687, y: -0.8598, z: 0.4822 },
  up:        { x:  0.1231, y:  0.9671, z: 0.2226 },
}

const containerRef = ref(null)

let THREE    = null
let renderer = null
let scene    = null
let camera   = null
let controls = null
let animId   = null
let observer = null
let g00Material     = null
let g01Material     = null
let retractMaterial = null

// ── 2D ruler overlay ──────────────────────────────────────────────────────────
let rulerCanvas = null
let rulerCtx    = null
let rulerPoints = []   // { pos: THREE.Vector3, text: string }[]

function drawRulerOverlay() {
  if (!rulerCtx || !camera || !rulerPoints.length) return
  const w = rulerCanvas.width, h = rulerCanvas.height
  rulerCtx.clearRect(0, 0, w, h)
  rulerCtx.textAlign = 'center'

  const tmp = new THREE.Vector3()
  for (const { pos, text, bold } of rulerPoints) {
    tmp.copy(pos).project(camera)
    if (tmp.z > 1) continue
    const sx = ( tmp.x * 0.5 + 0.5) * w
    const sy = (-tmp.y * 0.5 + 0.5) * h
    if (sx < -50 || sx > w + 50 || sy < -20 || sy > h + 20) continue
    rulerCtx.font      = bold ? 'bold 9px monospace' : '8px monospace'
    rulerCtx.fillStyle = bold ? 'rgba(60,200,100,0.85)' : 'rgba(160,160,190,0.65)'
    rulerCtx.fillText(text, sx, sy)
  }
}

// ── Init Three.js scene ───────────────────────────────────────────────────────
async function init() {
  const el = containerRef.value
  if (!el) return

  const [threeModule, { TrackballControls }] = await Promise.all([
    import('three'),
    import('three/addons/controls/TrackballControls.js'),
  ])
  THREE = threeModule

  g00Material     = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.2 })
  g01Material     = new THREE.LineBasicMaterial({ color: 0xffa030, opacity: 1 })
  retractMaterial = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 })

  const w = el.clientWidth
  const h = el.clientHeight

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(w, h)
  renderer.setClearColor(0x0a0a10)
  el.appendChild(renderer.domElement)

  // Intercept wheel: only zoom when Ctrl/Cmd held — otherwise let parent scroll
  renderer.domElement.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation()
  }, { capture: false })

  rulerCanvas = document.createElement('canvas')
  rulerCanvas.width  = w
  rulerCanvas.height = h
  rulerCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none'
  rulerCtx = rulerCanvas.getContext('2d')
  el.appendChild(rulerCanvas)

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 100000)
  camera.position.set(0, -50, 40)

  controls = new TrackballControls(camera, renderer.domElement)
  controls.rotateSpeed  = 5
  controls.zoomSpeed    = 1.2
  controls.panSpeed     = 0.8
  controls.staticMoving = true

  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())

  animate()
}

function animate() {
  animId = requestAnimationFrame(animate)
  controls?.update()
  renderer?.render(scene, camera)
  drawRulerOverlay()
}

// ── Build / rebuild toolpath geometry ────────────────────────────────────────
let lastGcodeText = null
let cameraFitted  = false

function clearScene() {
  rulerPoints = []
  const shared = new Set([g00Material, g01Material, retractMaterial])
  let geoCount = 0, matCount = 0
  scene.traverse(obj => {
    if (obj.geometry)                              { obj.geometry.dispose(); geoCount++ }
    if (obj.material && !shared.has(obj.material)) { obj.material.dispose(); matCount++ }
  })
  while (scene.children.length) scene.remove(scene.children[0])
  const info = renderer?.info?.memory
  console.log(`[GCode3D] clearScene: disposed ${geoCount} geo / ${matCount} mat | renderer: geometries=${info?.geometries ?? '?'} textures=${info?.textures ?? '?'}`)
}

function buildScene(gcodeText) {
  if (!scene) return
  if (gcodeText === lastGcodeText) return
  lastGcodeText = gcodeText

  clearScene()

  if (!gcodeText?.trim()) return

  const g00Pos     = []
  const g01Pos     = []
  const retractPos = []

  let x = 0, y = 0, z = 0, rapid = true

  for (const raw of gcodeText.split('\n')) {
    const line = raw.replace(/;.*$/, '').trim().toUpperCase()
    if (!line) continue

    const cmd = line.split(/\s/)[0]
    if (cmd === 'G0' || cmd === 'G00') rapid = true
    if (cmd === 'G1' || cmd === 'G01') rapid = false

    const xm = line.match(/X([-\d.]+)/)
    const ym = line.match(/Y([-\d.]+)/)
    const zm = line.match(/Z([-\d.]+)/)

    const nx = xm ? +xm[1] : x
    const ny = ym ? +ym[1] : y
    const nz = zm ? +zm[1] : z

    if (x !== nx || y !== ny || z !== nz) {
      const isZOnly = !xm && !ym && zm
      if (rapid && isZOnly && nz > z) {
        retractPos.push(x, y, z, nx, ny, nz)
      } else if (rapid) {
        g00Pos.push(x, y, z, nx, ny, nz)
      } else {
        g01Pos.push(x, y, z, nx, ny, nz)
      }
    }

    x = nx; y = ny; z = nz
  }

  const group = new THREE.Group()

  if (g00Pos.length) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g00Pos, 3))
    group.add(new THREE.LineSegments(geo, g00Material))
  }
  if (retractPos.length) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(retractPos, 3))
    group.add(new THREE.LineSegments(geo, retractMaterial))
  }
  if (g01Pos.length) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g01Pos, 3))
    group.add(new THREE.LineSegments(geo, g01Material))
  }

  scene.add(group)

  const box    = new THREE.Box3().setFromObject(group)
  const size   = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxLen = Math.max(size.x, size.y, size.z, 1)

  // Tight bounding box from cutting moves only — g00 rapid travel from 0/0
  // pulls the full group bbox to include the origin, which is wrong for display
  const workBox = new THREE.Box3()
  if (g01Pos.length) {
    for (let i = 0; i < g01Pos.length; i += 3) {
      workBox.expandByPoint(new THREE.Vector3(g01Pos[i], g01Pos[i + 1], g01Pos[i + 2]))
    }
  } else {
    workBox.copy(box)
  }
  const workSize   = workBox.getSize(new THREE.Vector3())
  const workCenter = workBox.getCenter(new THREE.Vector3())

  scene.add(new THREE.AxesHelper(maxLen * 0.5))

  const gridSize = Math.max(workSize.x, workSize.y) * 1.3
  const grid = new THREE.GridHelper(gridSize, 12, 0x333344, 0x222233)
  grid.rotation.x = Math.PI / 2
  grid.position.set(workCenter.x, workCenter.y, workBox.min.z)
  scene.add(grid)

  // ── Build ruler label positions (drawn each frame via Canvas 2D) ──────────
  const step    = niceStep(Math.max(workSize.x, workSize.y, 1))
  const zPlane  = workBox.min.z
  const tickLen = step * 0.18

  // Tick lines as 3D geometry — same approach as the grid
  const tickPts = []
  for (let rx = Math.ceil(workBox.min.x / step) * step; rx <= workBox.max.x + step * 0.1; rx += step) {
    tickPts.push(rx, workBox.min.y, zPlane,  rx, workBox.min.y - tickLen, zPlane)
  }
  for (let ry = Math.ceil(workBox.min.y / step) * step; ry <= workBox.max.y + step * 0.1; ry += step) {
    tickPts.push(workBox.min.x, ry, zPlane,  workBox.min.x - tickLen, ry, zPlane)
  }
  if (tickPts.length) {
    const tickGeo = new THREE.BufferGeometry()
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3))
    scene.add(new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial({ color: 0x444466 })))
  }

  // Canvas text labels at tick positions
  for (let rx = Math.ceil(workBox.min.x / step) * step; rx <= workBox.max.x + step * 0.1; rx += step) {
    rulerPoints.push({ pos: new THREE.Vector3(rx, workBox.min.y - tickLen * 1.6, zPlane), text: `${rx.toFixed(0)}` })
  }
  for (let ry = Math.ceil(workBox.min.y / step) * step; ry <= workBox.max.y + step * 0.1; ry += step) {
    rulerPoints.push({ pos: new THREE.Vector3(workBox.min.x - tickLen * 1.6, ry, zPlane), text: `${ry.toFixed(0)}` })
  }

  // ── Green bounding box at ground plane with dimension labels ─────────────
  const bboxPts = [
    workBox.min.x, workBox.min.y, zPlane,
    workBox.max.x, workBox.min.y, zPlane,
    workBox.max.x, workBox.max.y, zPlane,
    workBox.min.x, workBox.max.y, zPlane,
    workBox.min.x, workBox.min.y, zPlane,
  ]
  const bboxGeo = new THREE.BufferGeometry()
  bboxGeo.setAttribute('position', new THREE.Float32BufferAttribute(bboxPts, 3))
  scene.add(new THREE.Line(bboxGeo, new THREE.LineBasicMaterial({ color: 0x22cc66 })))

  // Dimension text: width along bottom edge, height along left edge
  rulerPoints.push({
    pos:  new THREE.Vector3(workCenter.x, workBox.min.y - tickLen * 3.2, zPlane),
    text: `${workSize.x.toFixed(1)} mm`,
    bold: true,
  })
  rulerPoints.push({
    pos:  new THREE.Vector3(workBox.min.x - tickLen * 3.2, workCenter.y, zPlane),
    text: `${workSize.y.toFixed(1)} mm`,
    bold: true,
  })

  // Fit camera only on first load
  if (!cameraFitted) {
    cameraFitted = true
    const fov  = camera.fov * (Math.PI / 180)
    const dist = (maxLen / 2) / Math.tan(fov / 2) * 1.6

    camera.near = dist / 100
    camera.far  = dist * 100
    camera.updateProjectionMatrix()

    controls.target.copy(center)
    camera.up.set(HOME.up.x, HOME.up.y, HOME.up.z)
    camera.position.set(
      center.x + HOME.direction.x * dist,
      center.y + HOME.direction.y * dist,
      center.z + HOME.direction.z * dist,
    )
    controls.update()
  }
}

// ── Ruler step — round mm value giving ~5-8 ticks across range ───────────────
function niceStep(range_mm) {
  const raw  = range_mm / 6
  const mag  = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))))
  const norm = raw / mag
  if (norm < 2) return mag
  if (norm < 5) return 2 * mag
  return 5 * mag
}

// ── Resize ────────────────────────────────────────────────────────────────────
function onResize() {
  const el = containerRef.value
  if (!el || !renderer || !camera) return
  const w = el.clientWidth, h = el.clientHeight
  renderer.setSize(w, h)
  if (rulerCanvas) { rulerCanvas.width = w; rulerCanvas.height = h }
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  controls?.handleResize()
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
watch(() => props.result?.text, (text) => { if (scene) buildScene(text ?? '') }, { flush: 'post' })

onMounted(async () => {
  await init()
  buildScene(props.result?.text ?? '')

  observer = new ResizeObserver(onResize)
  if (containerRef.value) observer.observe(containerRef.value)
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  observer?.disconnect()
  controls?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
  rulerCanvas?.remove()
})

function download() {
  const text = props.result?.text ?? ''
  const url  = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  Object.assign(document.createElement('a'), { href: url, download: 'toolpath.gcode' }).click()
  URL.revokeObjectURL(url)
}

function resetView() {
  const box    = new THREE.Box3()
  scene.children.forEach(c => box.expandByObject(c))
  if (box.isEmpty()) return

  const size   = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxLen = Math.max(size.x, size.y, size.z, 1)
  const fov    = camera.fov * (Math.PI / 180)
  const dist   = (maxLen / 2) / Math.tan(fov / 2) * 1.6

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

defineExpose({ resetView })
</script>

<template>
  <div class="gcode-preview">
    <div ref="containerRef" class="viewport" />
    <div class="footer">
      <span class="legend">
        <span class="line cutting" /> cutting &nbsp;
        <span class="line retract" /> retract &nbsp;
        <span class="line rapid"   /> rapid
        <span class="hint">left: rotate · scroll: zoom · right: pan</span>
      </span>
      <button class="dl-btn" :disabled="!result" @click="download">↓ Export GCODE</button>
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
}

.viewport {
  flex: 1;
  width: 100%;
  min-height: 0;
  position: relative;
  cursor: grab;
  &:active { cursor: grabbing; }
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-top: 1px solid @border;
  gap: 8px;
  flex-shrink: 0;
}

.legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  color: @muted;
}

.line {
  display: inline-block;
  width: 12px;
  height: 2px;
  border-radius: 1px;
  &.cutting { background: #ffa030; }
  &.retract { background: #4488ff; }
  &.rapid   { background: rgba(170,170,170,0.4); }
}

.hint {
  margin-left: 4px;
  opacity: 0.4;
  font-size: 8px;
}

.dl-btn {
  padding: 6px 12px;
  background: @accent;
  color: #111;
  border: none;
  border-radius: 5px;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.06em;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
  &:hover:not(:disabled) { background: @accent2; color: #fff; }
  &:disabled { opacity: 0.35; cursor: default; }
  &.secondary {
    background: @surface2;
    color: @muted;
    border: 1px solid @border;
    &:hover { color: @text; border-color: @accent; }
  }
}
</style>
