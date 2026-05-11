import { renderPaths } from '../vector/utils/renderPaths.js'

/**
 * Skeleton Path Following — walks THROUGH connected foreground pixels rather
 * than tracing their boundary. Produces single-line paths correct for thin
 * edge images (Canny output).  Contrast with Contours which uses Moore
 * Neighbor Tracing and doubles back along both sides of a 1px edge.
 *
 * Algorithm:
 *  1. Build fg[] from pixels ≥ 128
 *  2. Classify pixels: endpoints (1 fg neighbor), junctions (≥3), segments (2)
 *  3. Greedy walk: start from endpoints, continue to unvisited neighbors using
 *     dot-product direction preference for smooth curves
 *  4. After all endpoints, walk any remaining unvisited pixels (closed loops)
 *  5. Attempt to close loops: if last pixel is adjacent to first, append first
 */
export async function process(prev, params) {
  const bitmap = prev.bitmap
  const w = bitmap.width, h = bitmap.height
  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)

  const d      = ctx.getImageData(0, 0, w, h).data
  const minLen = params.minContour ?? 5

  const fg = new Uint8Array(w * h)
  for (let i = 0, p = 0; p < d.length; i++, p += 4)
    fg[i] = d[p] >= 128 ? 1 : 0

  const DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]

  function fgNeighbors(x, y) {
    const ns = []
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && fg[ny * w + nx])
        ns.push([nx, ny, dx, dy])
    }
    return ns
  }

  const endpoints = []
  const middle    = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!fg[y * w + x]) continue
      const n = fgNeighbors(x, y).length
      if      (n === 1) endpoints.push([x, y])
      else if (n >= 2)  middle.push([x, y])
    }
  }

  const visited  = new Uint8Array(w * h)
  const contours = []

  function walk(sx, sy) {
    const path = [[sx, sy, 0]]
    visited[sy * w + sx] = 1
    let dx = 0, dy = 0
    let cx = sx, cy = sy

    while (true) {
      const ns = fgNeighbors(cx, cy).filter(([nx, ny]) => !visited[ny * w + nx])
      if (!ns.length) break

      let best = ns[0], bestDot = -Infinity
      for (const n of ns) {
        const dot = dx * n[2] + dy * n[3]
        if (dot > bestDot) { bestDot = dot; best = n }
      }

      const [nx, ny, ddx, ddy] = best
      visited[ny * w + nx] = 1
      path.push([nx, ny, 0])
      dx = ddx; dy = ddy
      cx = nx; cy = ny
    }

    // Close loop if last pixel is adjacent to first
    if (path.length > 2) {
      const [lx, ly] = path[path.length - 1]
      const [fx, fy] = path[0]
      if ((lx !== fx || ly !== fy) && Math.abs(lx - fx) <= 1 && Math.abs(ly - fy) <= 1)
        path.push([fx, fy, 0])
    }

    return path
  }

  for (const [sx, sy] of endpoints) {
    if (visited[sy * w + sx]) continue
    const path = walk(sx, sy)
    if (path.length >= minLen) contours.push(path)
  }

  for (const [sx, sy] of middle) {
    if (visited[sy * w + sx]) continue
    const path = walk(sx, sy)
    if (path.length >= minLen) contours.push(path)
  }

  const totalPts = contours.reduce((s, c) => s + c.length, 0)
  console.log(`[Skeleton] ${contours.length} paths  ${totalPts} pts  ${w}×${h}`)

  return {
    pluginId: 'skeleton',
    kind:     'image',
    bitmap:   renderPaths(contours, w, h),
    contours,
  }
}
