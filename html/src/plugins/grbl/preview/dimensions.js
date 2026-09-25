import { compileProgram } from './viewCam.js'

/**
 * Dimension bands for every 3D view — like PatternMaster's overshoot band: a light, translucent
 * strip along the front (X) and the left (Y) edge of the piece, on the surface plane just
 * outside it, with the length written in its middle. Being part of the scene, it turns and
 * zooms with the piece.
 *
 * One layout and one label drawing, two ways to put them on screen:
 *   makeDimensionBands(gl)          — for the raw WebGL2 views (3D relief, CAM)
 *   makeDimensionMeshes(THREE, …)   — for the three.js view (vector preview)
 */

const TEX_LENGTH = 1024      // texture pixels along a band
const INK        = 'rgba(235, 235, 240, 0.9)'
const PAPER      = 'rgba(255, 255, 255, 0.1)'

/**
 * Where the bands go for a piece `{ x, y, w, h }` (mm). Each band's `corners` are where the
 * label's left-top, right-top, right-bottom and left-bottom land; `margin` is the room the
 * bands take left of and in front of the piece.
 */
export function dimensionLayout({ x, y, w, h }) {
  const size  = Math.max(w, h, 10)
  const width = size * 0.08
  const gap   = size * 0.025
  const x1 = x + w, y1 = y + h
  const yo = y - gap, yi = yo - width          // X band: in front, the text's top points away (+Y)
  const xo = x - gap - width, xi = x - gap     // Y band: on the left, read bottom to top (top → −X)
  return {
    width,
    margin: gap + width,
    bands: [
      { length: w, corners: [[x, yo, 0], [x1, yo, 0], [x1, yi, 0], [x, yi, 0]] },
      { length: h, corners: [[xo, y, 0], [xo, y1, 0], [xi, y1, 0], [xi, y, 0]] },
    ],
  }
}

/** A view box [x0,y0,z0,x1,y1,z1] with room for the bands (for framing and near/far). */
export function growForDimensions(box, layout) {
  const [x0, y0, z0, x1, y1, z1] = box
  return [x0 - layout.margin, y0 - layout.margin, z0, x1, y1, z1]
}

/** "260 mm", "8.5 mm", "1.25 m" */
export function formatLength(mm) {
  if (mm >= 1000) return `${(mm / 1000).toFixed(2)} m`
  return `${mm < 10 ? mm.toFixed(1) : Math.round(mm)} mm`
}

/** Two triangles with texture coordinates: 6 × (x, y, z, u, v); (0,0) is the label's left-top. */
function quad([lt, rt, rb, lb]) {
  return new Float32Array([
    ...lt, 0, 0,  ...rt, 1, 0,  ...rb, 1, 1,
    ...lt, 0, 0,  ...rb, 1, 1,  ...lb, 0, 1,
  ])
}

/** The label: a dimension line with end ticks and the length in the middle, on a faint band. */
function drawLabel(lengthMm, widthMm) {
  const W = TEX_LENGTH, H = Math.max(24, Math.round(W * widthMm / Math.max(lengthMm, 1e-6)))
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const g = canvas.getContext('2d')
  g.fillStyle = PAPER
  g.fillRect(0, 0, W, H)

  const text = formatLength(lengthMm)
  g.font = `600 ${Math.round(H * 0.6)}px -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif`
  g.textAlign = 'center'; g.textBaseline = 'middle'
  const half = g.measureText(text).width / 2 + H * 0.35
  const line = Math.max(1.5, H * 0.05), mid = H / 2

  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = line
  g.beginPath()
  g.moveTo(line / 2, H * 0.2);     g.lineTo(line / 2, H * 0.8)          // end ticks
  g.moveTo(W - line / 2, H * 0.2); g.lineTo(W - line / 2, H * 0.8)
  if (W / 2 - half > H * 0.3) {                                        // the line, if there is room
    g.moveTo(0, mid); g.lineTo(W / 2 - half, mid)
    g.moveTo(W / 2 + half, mid); g.lineTo(W, mid)
  }
  g.stroke()
  g.fillText(text, W / 2, mid)
  return canvas
}

/**
 * For the raw WebGL2 views:
 *   const bands = makeDimensionBands(gl)
 *   bands.set(piece)      // { x, y, w, h } in mm
 *   bands.grow(box)       // the view box with room for the bands
 *   bands.draw(mvp)       // after the scene; blended, doesn't write depth
 */
export function makeDimensionBands(gl) {
  const prog = compileProgram(gl, `#version 300 es
in vec3 aPos; in vec2 aUV; uniform mat4 uMVP; out vec2 vUV;
void main(){ gl_Position = uMVP * vec4(aPos,1.0); vUV = aUV; }`, `#version 300 es
precision mediump float; in vec2 vUV; uniform sampler2D uTex; out vec4 o;
void main(){ o = texture(uTex, vUV); }`)
  const aPos = gl.getAttribLocation(prog, 'aPos'), aUV = gl.getAttribLocation(prog, 'aUV')
  const uMVP = gl.getUniformLocation(prog, 'uMVP'), uTex = gl.getUniformLocation(prog, 'uTex')

  const bands = [0, 1].map(() => ({ buf: gl.createBuffer(), tex: gl.createTexture() }))
  let layout = null

  function upload(tex, canvas) {
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE)
  }

  return {
    set(piece) {
      layout = dimensionLayout(piece)
      layout.bands.forEach(({ length, corners }, i) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, bands[i].buf)
        gl.bufferData(gl.ARRAY_BUFFER, quad(corners), gl.STATIC_DRAW)
        upload(bands[i].tex, drawLabel(length, layout.width))
      })
    },

    grow(box) {
      return layout ? growForDimensions(box, layout) : box
    },

    draw(mvp) {
      if (!layout) return
      gl.useProgram(prog)
      gl.uniformMatrix4fv(uMVP, false, new Float32Array(mvp))
      gl.uniform1i(uTex, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.depthMask(false)
      for (const band of bands) {
        gl.bindBuffer(gl.ARRAY_BUFFER, band.buf)
        gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 20, 0)
        gl.enableVertexAttribArray(aUV);  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 20, 12)
        gl.bindTexture(gl.TEXTURE_2D, band.tex)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      }
      gl.disableVertexAttribArray(aUV)
      gl.depthMask(true)
      gl.disable(gl.BLEND)
    },
  }
}

/**
 * For the three.js view: the bands as meshes (textures are the materials' `map` — dispose
 * them with the material). `THREE` is passed in, so this module doesn't load three.js.
 */
export function makeDimensionMeshes(THREE, piece) {
  const layout = dimensionLayout(piece)
  const meshes = layout.bands.map(({ length, corners }) => {
    const data = quad(corners)
    const pos = [], uv = []
    for (let i = 0; i < data.length; i += 5) { pos.push(data[i], data[i + 1], data[i + 2]); uv.push(data[i + 3], data[i + 4]) }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uv, 2))
    const map = new THREE.CanvasTexture(drawLabel(length, layout.width))
    map.flipY      = false                     // (0,0) is the label's left-top, as in the WebGL views
    map.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    return new THREE.Mesh(geo, mat)
  })
  return { meshes, layout }
}
