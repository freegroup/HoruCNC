/**
 * Shared orbit camera + tiny mat4 helpers for the 3D and CAM views (ported from PatternMaster).
 * Both views work in the same world coordinates (G-code mm), so they share one camera:
 * switching views keeps the angle and zoom.
 */

import { storage } from '@/stores/storage.js'

const sub   = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot   = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const nrmz  = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }

export function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far)
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]
}
export function lookAt(eye, center, up) {
  const z = nrmz(sub(eye, center)), x = nrmz(cross(up, z)), y = cross(z, x)
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]
}
export function mul(a, b) {
  const o = new Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
    o[c * 4 + r] = s
  }
  return o
}

const FOV  = 40 * Math.PI / 180
const HOME = { az: -60 * Math.PI / 180, el: 35 * Math.PI / 180 }

export function createViewCam() {
  return { ...HOME, dist: 200, target: [0, 0, 0], framedFor: '' }
}

/**
 * The one camera all 3D views share (like PatternMaster's PM.viewCam): they all work in
 * G-code coordinates (mm, origin bottom-left of the paths), so switching between steps
 * or tabs keeps angle and zoom. Only the first view to show something fits it.
 */
export const sharedCam = createViewCam()

// ── Persistence (like PatternMaster's PM.settings: the camera is collected on save) ──
// The camera changes every frame while someone orbits, so it is not reactive state —
// it is stored when the page is hidden or left (reload, tab switch, close) and restored here.
const CAM_KEY = 'camera'

function restoreCamera(saved) {
  if (!saved || typeof saved !== 'object') return
  const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback)
  // A broken camera (NaN in dist or target) would leave the view black — check every value
  sharedCam.az   = num(saved.az, sharedCam.az)
  sharedCam.el   = Math.max(-1.5533, Math.min(1.5533, num(saved.el, sharedCam.el)))
  sharedCam.dist = Math.max(1e-3, num(saved.dist, sharedCam.dist))
  if (Array.isArray(saved.target) && saved.target.length === 3 && saved.target.every(v => isFinite(v)))
    sharedCam.target = saved.target.slice()
  // Only with framedFor kept does the restored view survive — otherwise the first view refits
  sharedCam.framedFor = typeof saved.framedFor === 'string' ? saved.framedFor : ''
}

restoreCamera(storage.get(CAM_KEY))

const saveCamera = () => storage.set(CAM_KEY, { ...sharedCam })
addEventListener('pagehide', saveCamera)
document.addEventListener('visibilitychange', () => { if (document.hidden) saveCamera() })

export function eyeOf(cam) {
  const ce = Math.max(0.001, Math.cos(cam.el))
  return [cam.target[0] + cam.dist * ce * Math.cos(cam.az), cam.target[1] + cam.dist * ce * Math.sin(cam.az), cam.target[2] + cam.dist * Math.sin(cam.el)]
}

/** View-projection for a box [x0,y0,z0]–[x1,y1,z1]; near/far hug the box (also when zoomed into it). */
export function viewProj(cam, aspect, box) {
  const eye = eyeOf(cam)
  const [x0, y0, z0, x1, y1, z1] = box
  const toBox = Math.hypot(
    Math.max(x0 - eye[0], 0, eye[0] - x1),
    Math.max(y0 - eye[1], 0, eye[1] - y1),
    Math.max(z0 - eye[2], 0, eye[2] - z1))
  let dmax = 0
  for (const cx of [x0, x1]) for (const cy of [y0, y1]) for (const cz of [z0, z1])
    dmax = Math.max(dmax, Math.hypot(cx - eye[0], cy - eye[1], cz - eye[2]))
  const near = Math.max(1e-4, toBox > 0 ? toBox * 0.95 : cam.dist * 1e-3)
  const far  = dmax * 1.05 + near
  return { eye, mvp: mul(perspective(FOV, aspect, near, far), lookAt(eye, cam.target, [0, 0, 1])) }
}

/** Aim at the box centre and pick the distance so its 8 corners fill ~90 % of the view. */
export function fitView(cam, aspect, box) {
  const [x0, y0, z0, x1, y1, z1] = box
  const cs = []
  for (const cx of [x0, x1]) for (const cy of [y0, y1]) for (const cz of [z0, z1]) cs.push([cx, cy, cz])
  cam.target = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]
  let dist = Math.max(x1 - x0, y1 - y0, 10)
  for (let it = 0; it < 5; it++) {
    cam.dist = dist
    const mvp = mul(perspective(FOV, aspect, dist * 0.03, dist * 6 + 2000), lookAt(eyeOf(cam), cam.target, [0, 0, 1]))
    let m = 1e-3
    for (const c of cs) {
      const w = mvp[3] * c[0] + mvp[7] * c[1] + mvp[11] * c[2] + mvp[15]
      m = Math.max(m,
        Math.abs((mvp[0] * c[0] + mvp[4] * c[1] + mvp[8] * c[2] + mvp[12]) / w),
        Math.abs((mvp[1] * c[0] + mvp[5] * c[1] + mvp[9] * c[2] + mvp[13]) / w))
    }
    dist *= m / 0.9
  }
  cam.dist = dist
}

export function resetCam(cam) {
  Object.assign(cam, HOME, { framedFor: '' })
}

/**
 * Orbit / pan / zoom on a canvas — PatternMaster's controls (js/renderers/webgl3d.js):
 * left-drag = orbit, shift/middle-drag = pan (right-drag too), wheel = zoom, double-click = reset.
 *
 * In a scrolling page the wheel belongs to the page until the view has been clicked
 * (PatternMaster's viewer.js does the same), otherwise scrolling past a view would zoom it.
 * Leaving the view hands the wheel back to the page. A trackpad pinch (ctrl + wheel) always zooms.
 * Returns a detach function.
 */
export function attachOrbit(canvas, cam, { span, onChange, onReset }) {
  let drag = null
  let engaged = false
  const down = e => {
    engaged = true
    const pan = e.shiftKey || e.button === 1 || e.button === 2
    if (e.button !== 0) e.preventDefault()
    drag = { x: e.clientX, y: e.clientY, pan }
    canvas.style.cursor = pan ? 'move' : 'grabbing'
    canvas.setPointerCapture?.(e.pointerId)
  }
  const move = e => {
    if (!drag) return
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y
    drag.x = e.clientX; drag.y = e.clientY
    if (drag.pan) {
      const s = cam.dist * 0.0015
      const rx = -Math.sin(cam.az), ry = Math.cos(cam.az)
      const ux = -Math.cos(cam.az) * Math.sin(cam.el), uy = -Math.sin(cam.az) * Math.sin(cam.el), uz = Math.cos(cam.el)
      cam.target[0] += (-rx * dx + ux * dy) * s
      cam.target[1] += (-ry * dx + uy * dy) * s
      cam.target[2] += (uz * dy) * s
    } else {
      cam.az -= dx * 0.01
      cam.el = Math.max(-1.5533, Math.min(1.5533, cam.el + dy * 0.01))
    }
    onChange()
  }
  const up = () => { drag = null; canvas.style.cursor = 'grab' }
  const leave = () => { if (!drag) engaged = false }
  const wheel = e => {
    if (!engaged && !e.ctrlKey && !e.metaKey) return   // page scrolls
    e.preventDefault()
    const s = Math.max(span(), 10)
    cam.dist = Math.min(s * 20, Math.max(s * 1e-3, cam.dist * (1 + Math.sign(e.deltaY) * 0.1)))
    onChange()
  }
  const menu = e => e.preventDefault()
  canvas.style.cursor = 'grab'
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)
  canvas.addEventListener('pointerleave', leave)
  canvas.addEventListener('wheel', wheel, { passive: false })
  canvas.addEventListener('contextmenu', menu)
  canvas.addEventListener('dblclick', onReset)
  return () => {
    canvas.removeEventListener('pointerdown', down)
    canvas.removeEventListener('pointermove', move)
    canvas.removeEventListener('pointerup', up)
    canvas.removeEventListener('pointercancel', up)
    canvas.removeEventListener('pointerleave', leave)
    canvas.removeEventListener('wheel', wheel)
    canvas.removeEventListener('contextmenu', menu)
    canvas.removeEventListener('dblclick', onReset)
  }
}

export function compileProgram(gl, vs, fs) {
  const sh = (t, s) => {
    const o = gl.createShader(t)
    gl.shaderSource(o, s); gl.compileShader(o)
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o))
    return o
  }
  const p = gl.createProgram()
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs))
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
  return p
}
