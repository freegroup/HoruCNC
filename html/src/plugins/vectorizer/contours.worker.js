import { renderPaths } from '../vector/utils/renderPaths.js'

/**
 * Moore Neighbor Tracing — traces outer boundary of foreground regions as
 * ordered polylines. Equivalent to OpenCV findContours(CHAIN_APPROX_SIMPLE).
 *
 * Stopping criterion: return to start pixel (simple, works for all closed shapes).
 * invertFill mirrors Python's (255-gray): trace DARK shapes when enabled.
 */
export async function process(prev, params) {
  const bitmap = prev.bitmap
  const w = bitmap.width, h = bitmap.height
  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)

  const d      = ctx.getImageData(0, 0, w, h).data
  const minLen = params.minContour ?? 10
  const invert = params.invertFill ?? false

  const fg = new Uint8Array(w * h)
  for (let i = 0, p = 0; p < d.length; i++, p += 4) {
    const bright = d[p] >= 128
    fg[i] = (invert ? !bright : bright) ? 1 : 0
  }

  // 8-connected directions, clockwise from North
  const DIRS = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]

  const inBounds = (x, y) => x >= 0 && x < w && y >= 0 && y < h
  const isFg     = (x, y) => inBounds(x, y) && fg[y * w + x] === 1
  const dirOf    = (dx, dy) => { for (let i = 0; i < 8; i++) if (DIRS[i][0] === dx && DIRS[i][1] === dy) return i; return 0 }

  function traceContour(sx, sy) {
    const maxPts = (w + h) * 4
    const pts = [[sx, sy, 0]]
    let bx = sx, by = sy - 1
    let cx = sx, cy = sy

    while (pts.length < maxPts) {
      const backDir  = dirOf(bx - cx, by - cy)
      let lastBgX = bx, lastBgY = by
      let nx = -1, ny = -1

      for (let step = 1; step <= 8; step++) {
        const dir = (backDir + step) % 8
        const tx  = cx + DIRS[dir][0]
        const ty  = cy + DIRS[dir][1]
        if (!isFg(tx, ty)) {
          if (inBounds(tx, ty)) { lastBgX = tx; lastBgY = ty }
          continue
        }
        nx = tx; ny = ty
        break
      }

      if (nx === -1) break
      if (nx === sx && ny === sy) break

      pts.push([nx, ny, 0])
      bx = lastBgX; by = lastBgY
      cx = nx; cy = ny
    }

    if (pts.length > 1) pts.push([sx, sy, 0])
    return pts
  }

  const contours = []
  const traced   = new Uint8Array(w * h)

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (!fg[i] || traced[i] || fg[(y - 1) * w + x]) continue

      const contour = traceContour(x, y)
      if (contour.length >= minLen) {
        contours.push(contour)
        for (const [px, py] of contour) traced[py * w + px] = 1
      }
    }
  }

  const totalPts = contours.reduce((s, c) => s + c.length, 0)
  console.log(`[Contours] ${contours.length} contours  ${totalPts} pts  ${w}×${h}`)

  return {
    pluginId: 'contours',
    kind:     'image',
    bitmap:   renderPaths(contours, w, h),
    contours,
  }
}
