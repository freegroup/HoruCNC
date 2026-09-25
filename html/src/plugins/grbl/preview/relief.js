import { viewProj, compileProgram } from './viewCam.js'
import { makeDimensionBands } from './dimensions.js'

/**
 * 3D view — relief raymarching of the simulated height field (WebGL2), ported from
 * PatternMaster (js/renderers/webgl3d.js). The Z-map is an R32F texture; per pixel the view
 * ray is marched against it, so cutter walls stay pixel-sharp and round tools stay round.
 */

const VS = `#version 300 es
in vec3 aPos; in vec3 aNormal;
uniform mat4 uMVP;
out vec3 vWorld; out vec3 vFaceN;
void main(){ gl_Position = uMVP * vec4(aPos,1.0); vWorld = aPos; vFaceN = aNormal; }`

const FS = `#version 300 es
precision highp float; precision highp sampler2D;
in vec3 vWorld; in vec3 vFaceN;
uniform vec3 uEye, uLight, uWood;
uniform vec2 uOrigin, uBoard;   // world position and extent of the stock (x,y)
uniform float uZBase, uDepth, uCell;
uniform sampler2D uH;           // R32F height field (<=0 cut, 0 = surface)
out vec4 outC;

float Hf(vec2 xy){ return texture(uH, clamp((xy - uOrigin) / uBoard, 0.0, 1.0)).r; }

vec3 shade(vec3 N, vec3 P, vec3 albedo){
  vec3 L = normalize(uLight), Vd = normalize(uEye - P);
  float d = max(dot(N, L), 0.0);
  float sp = pow(max(dot(N, normalize(L + Vd)), 0.0), 20.0) * 0.28;
  return min(albedo * (0.30 + 0.85 * d) + vec3(1.0) * sp, vec3(1.0));
}

void main(){
  vec3 ro = vWorld;
  vec3 rd = normalize(vWorld - uEye);
  vec2 lo = uOrigin, hi = uOrigin + uBoard;

  // Camera inside the stock: the front faces are clipped, so start the ray at the eye.
  if (uEye.x > lo.x && uEye.x < hi.x && uEye.y > lo.y && uEye.y < hi.y && uEye.z > uZBase && uEye.z < 0.0) ro = uEye;

  // Entering through a side/bottom face already inside material -> that's a wall.
  if (ro.z - Hf(ro.xy) <= 0.0) { outC = vec4(shade(normalize(vFaceN), ro, uWood * 0.72), 1.0); return; }

  float horiz = length(rd.xy);
  float tStep = min(uCell / max(horiz, 1e-4), (uDepth / 64.0) / max(abs(rd.z), 1e-4));
  vec3 P = ro, prev = ro; bool hit = false;
  for (int i = 1; i < 400; i++) {
    P = ro + rd * (float(i) * tStep);
    if (P.z < uZBase - 0.01 || P.x < lo.x - uCell || P.y < lo.y - uCell || P.x > hi.x + uCell || P.y > hi.y + uCell) break;
    if (P.z - Hf(P.xy) <= 0.0) { hit = true; break; }
    prev = P;
  }
  if (!hit) discard;

  vec3 a = prev, b = P;
  for (int i = 0; i < 6; i++) { vec3 m = 0.5 * (a + b); if (m.z - Hf(m.xy) <= 0.0) b = m; else a = m; }
  P = b;

  float e = uCell;
  float hx = Hf(P.xy + vec2(e, 0.0)) - Hf(P.xy - vec2(e, 0.0));
  float hy = Hf(P.xy + vec2(0.0, e)) - Hf(P.xy - vec2(0.0, e));
  vec3 N = normalize(vec3(-hx / (2.0 * e), -hy / (2.0 * e), 1.0));
  outC = vec4(shade(N, P, uWood), 1.0);
}`

const LIGHT = (() => {
  const az = 35 * Math.PI / 180, el = 32 * Math.PI / 180
  return [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)]
})()
const WOOD = [181 / 255, 133 / 255, 78 / 255]

export function makeRelief(canvas) {
  const gl = canvas.getContext('webgl2')
  if (!gl) throw new Error('The 3D view needs WebGL2, which this browser does not provide.')

  const prog = compileProgram(gl, VS, FS)
  const aPos = gl.getAttribLocation(prog, 'aPos'), aNrm = gl.getAttribLocation(prog, 'aNormal')
  const U = {}
  for (const n of ['uMVP', 'uEye', 'uLight', 'uWood', 'uOrigin', 'uBoard', 'uZBase', 'uDepth', 'uCell', 'uH'])
    U[n] = gl.getUniformLocation(prog, n)

  const bPos = gl.createBuffer(), bNrm = gl.createBuffer()
  const bands = makeDimensionBands(gl)
  let boxCount = 0
  let box = null            // [x0,y0,z0,x1,y1,z1] of the stock in world mm (what the shader marches)
  let cell = 1

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST)
  for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE)

  gl.enable(gl.DEPTH_TEST)
  gl.clearColor(0.055, 0.055, 0.063, 1)

  function buildBox([x0, y0, z0, x1, y1, z1]) {
    const pos = [], nrm = []
    const quad = (p, n) => {
      const [a, b, c, d] = p
      for (const v of [a, b, c, a, c, d]) pos.push(v[0], v[1], v[2])
      for (let i = 0; i < 6; i++) nrm.push(n[0], n[1], n[2])
    }
    quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1])
    quad([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], [0, 0, -1])
    quad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0])
    quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0])
    quad([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0])
    quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0])
    gl.bindBuffer(gl.ARRAY_BUFFER, bPos); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, bNrm); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nrm), gl.STATIC_DRAW)
    boxCount = pos.length / 3
  }

  return {
    /** The view box: the stock with its dimension bands */
    get box() { return box && bands.grow(box) },

    /** sim: { H, nx, ny, cell, stock: {x, y, w, h} } */
    setSim(sim) {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, sim.nx, sim.ny, 0, gl.RED, gl.FLOAT, sim.H)
      let minH = 0
      for (let i = 0; i < sim.H.length; i++) if (sim.H[i] < minH) minH = sim.H[i]
      const { x, y } = sim.stock
      const w = (sim.nx - 1) * sim.cell, h = (sim.ny - 1) * sim.cell
      const zBase = minH - Math.max(3, -minH * 0.15)
      cell = sim.cell
      box  = [x, y, zBase, x + w, y + h, 0]
      buildBox(box)
      bands.set(sim.stock)
    },

    draw(cam) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      if (!boxCount) return
      const { eye, mvp } = viewProj(cam, canvas.width / canvas.height, bands.grow(box))
      gl.useProgram(prog)
      gl.uniformMatrix4fv(U.uMVP, false, new Float32Array(mvp))
      gl.uniform3fv(U.uEye, new Float32Array(eye))
      gl.uniform3fv(U.uLight, new Float32Array(LIGHT))
      gl.uniform3fv(U.uWood, new Float32Array(WOOD))
      gl.uniform2f(U.uOrigin, box[0], box[1])
      gl.uniform2f(U.uBoard, box[3] - box[0], box[4] - box[1])
      gl.uniform1f(U.uZBase, box[2]); gl.uniform1f(U.uDepth, -box[2]); gl.uniform1f(U.uCell, cell)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.uH, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, bPos); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, bNrm); gl.enableVertexAttribArray(aNrm); gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, boxCount)
      bands.draw(mvp)
    },

    dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext() },
  }
}
