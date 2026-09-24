import { viewProj, compileProgram } from './viewCam.js'
import { cssColor, rgbFloat } from '@/assets/colors.js'

/**
 * CAM view — toolpath backplot (WebGL2), ported from PatternMaster (js/renderers/cam.js):
 * rapids grey, cuts in the accent colour, XYZ axes at the G-code origin, the stock as a thin grey frame
 * with a floor under it that sets it apart from the background.
 */

const RAPID = [0.62, 0.66, 0.72], WIRE = [0.45, 0.47, 0.52]
const FLOOR = [0.275, 0.322, 0.384]

export function makeCamPaths(canvas) {
  const CUT = rgbFloat(cssColor('accent') || '#ffffff')   // cuts in the tint colour
  const gl = canvas.getContext('webgl2')
  if (!gl) throw new Error('The CAM view needs WebGL2, which this browser does not provide.')

  const prog = compileProgram(gl, `#version 300 es
in vec3 aPos; in vec3 aColor; uniform mat4 uMVP; out vec3 vC;
void main(){ gl_Position = uMVP * vec4(aPos,1.0); vC = aColor; }`, `#version 300 es
precision mediump float; in vec3 vC; out vec4 o; void main(){ o = vec4(vC,1.0); }`)
  const aPos = gl.getAttribLocation(prog, 'aPos'), aCol = gl.getAttribLocation(prog, 'aColor')
  const uMVP = gl.getUniformLocation(prog, 'uMVP')
  const posB = gl.createBuffer(), colB = gl.createBuffer()
  const fPosB = gl.createBuffer(), fColB = gl.createBuffer()
  let lineCount = 0, frameCount = 0
  let box = null

  gl.enable(gl.DEPTH_TEST)
  gl.clearColor(0.055, 0.055, 0.063, 1)

  function bind(p, c) {
    gl.bindBuffer(gl.ARRAY_BUFFER, p); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, c); gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 0, 0)
  }

  return {
    get box() { return box },

    /** moves: packed [rapid, x, y, z] × n;  stock: {x, y, w, h} */
    setPaths(moves, stock) {
      const n = moves.length / 4
      const floats = (Math.max(0, n - 1) + 3) * 6
      const pos = new Float32Array(floats), col = new Float32Array(floats)
      let k = 0
      const put = (x, y, z, c) => {
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z
        col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2]
        k += 3
      }
      let minZ = 0, maxZ = 0
      for (let i = 1; i < n; i++) {
        const a = (i - 1) * 4, b = i * 4
        const c = moves[b] === 1 ? RAPID : CUT
        put(moves[a + 1], moves[a + 2], moves[a + 3], c)
        put(moves[b + 1], moves[b + 2], moves[b + 3], c)
        minZ = Math.min(minZ, moves[b + 3]); maxZ = Math.max(maxZ, moves[b + 3])
      }
      const { x: X0, y: Y0, w: W, h: H } = stock
      const len = 0.12 * Math.max(W, H, 10)
      for (const [dx, dy, dz, c] of [[len, 0, 0, [0.85, 0.2, 0.2]], [0, len, 0, [0.2, 0.7, 0.3]], [0, 0, len, [0.3, 0.5, 0.95]]]) {
        put(0, 0, 0, c); put(dx, dy, dz, c)
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, posB); gl.bufferData(gl.ARRAY_BUFFER, pos.subarray(0, k), gl.STATIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, colB); gl.bufferData(gl.ARRAY_BUFFER, col.subarray(0, k), gl.STATIC_DRAW)
      lineCount = k / 3

      // Stock frame as thin beams, offset inwards so the outer edge is the true stock size
      const zb = Math.min(-3, minZ - 3)
      const t  = Math.max(0.2, 0.0015 * Math.max(W, H))
      const fp = [], fc = []
      const quad = (a, b, c, d, colr = WIRE) => {
        for (const p of [a, b, c, a, c, d]) { fp.push(p[0], p[1], p[2]); fc.push(colr[0], colr[1], colr[2]) }
      }
      const beam = (P0, P1, o1, o2) => {
        const A = (P, s1, s2) => [P[0] + s1 * o1[0] + s2 * o2[0], P[1] + s1 * o1[1] + s2 * o2[1], P[2] + s1 * o1[2] + s2 * o2[2]]
        const a0 = A(P0, 0, 0), a1 = A(P0, 1, 0), a2 = A(P0, 1, 1), a3 = A(P0, 0, 1)
        const b0 = A(P1, 0, 0), b1 = A(P1, 1, 0), b2 = A(P1, 1, 1), b3 = A(P1, 0, 1)
        quad(a0, a1, b1, b0); quad(a1, a2, b2, b1); quad(a2, a3, b3, b2); quad(a3, a0, b0, b3)
        quad(a0, a1, a2, a3); quad(b0, b3, b2, b1)
      }
      const X1 = X0 + W, Y1 = Y0 + H
      const C = [[X0, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [X0, Y1, 0], [X0, Y0, zb], [X1, Y0, zb], [X1, Y1, zb], [X0, Y1, zb]]
      const edges = [
        [0, 1, [0, t, 0], [0, 0, -t]], [1, 2, [-t, 0, 0], [0, 0, -t]], [2, 3, [0, -t, 0], [0, 0, -t]], [3, 0, [t, 0, 0], [0, 0, -t]],
        [4, 5, [0, t, 0], [0, 0, t]], [5, 6, [-t, 0, 0], [0, 0, t]], [6, 7, [0, -t, 0], [0, 0, t]], [7, 4, [t, 0, 0], [0, 0, t]],
        [0, 4, [t, 0, 0], [0, t, 0]], [1, 5, [-t, 0, 0], [0, t, 0]], [2, 6, [-t, 0, 0], [0, -t, 0]], [3, 7, [t, 0, 0], [0, -t, 0]],
      ]
      for (const [i, j, o1, o2] of edges) beam(C[i], C[j], o1, o2)
      const zf = zb + t / 2
      quad([X0, Y0, zf], [X1, Y0, zf], [X1, Y1, zf], [X0, Y1, zf], FLOOR)
      gl.bindBuffer(gl.ARRAY_BUFFER, fPosB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(fp), gl.STATIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, fColB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(fc), gl.STATIC_DRAW)
      frameCount = fp.length / 3

      box = [Math.min(X0, 0), Math.min(Y0, 0), zb, X1, Y1, Math.max(maxZ, 0)]
    },

    draw(cam) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      if (!lineCount) return
      const { mvp } = viewProj(cam, canvas.width / canvas.height, box)
      gl.useProgram(prog)
      gl.uniformMatrix4fv(uMVP, false, new Float32Array(mvp))
      bind(posB, colB); gl.drawArrays(gl.LINES, 0, lineCount)
      bind(fPosB, fColB); gl.drawArrays(gl.TRIANGLES, 0, frameCount)
    },

    dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext() },
  }
}
