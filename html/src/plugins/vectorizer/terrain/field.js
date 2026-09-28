import { inkDepth } from '../../image/utils/ink.js'

// Worker-side tools for the terrain strategies (see strategies/index.js)

/** The picture as depth 0…1 per pixel (0 = not milled); `at(x, y)` is -1 outside the picture. */
export function depthField(bitmap, threshold) {
  const w = bitmap.width, h = bitmap.height
  const ctx = new OffscreenCanvas(w, h).getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const d = ctx.getImageData(0, 0, w, h).data
  const k = new Float32Array(w * h)
  for (let i = 0; i < k.length; i++) k[i] = inkDepth(d[i * 4], threshold)
  return {
    w, h, k,
    at(x, y) {
      const ix = Math.round(x), iy = Math.round(y)
      return ix < 0 || iy < 0 || ix >= w || iy >= h ? -1 : k[iy * w + ix]
    },
  }
}

/** The milled runs along a point sequence, as paths with z = -maxDepth · depth. */
export function cutAlong(field, pts, maxDepth) {
  const out = []
  let run = []
  const end = () => { if (run.length >= 2) out.push(run); run = [] }
  for (const [x, y] of pts) {
    const k = field.at(x, y)
    if (k <= 0) { end(); continue }
    run.push([x, y, -maxDepth * k])
  }
  end()
  return out
}

/** Points every pixel from a to b. */
export function line([ax, ay], [bx, by]) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)))
  return Array.from({ length: n + 1 }, (_, i) => [ax + (bx - ax) * i / n, ay + (by - ay) * i / n])
}

/**
 * Parallel lines over the whole picture at `angle` degrees (0 = along X), `step` px apart,
 * running back and forth so the cutter's way to the next line is short.
 */
export function parallelLines(w, h, step, angle) {
  const a = angle * Math.PI / 180
  const dx = Math.cos(a), dy = Math.sin(a)          // along a line
  const nx = -dy, ny = dx                           // from line to line
  const cx = w / 2, cy = h / 2, half = Math.hypot(w, h) / 2
  const lines = []
  for (let t = -half, i = 0; t <= half; t += step, i++) {
    const ox = cx + nx * t, oy = cy + ny * t
    const from = [ox - dx * half, oy - dy * half], to = [ox + dx * half, oy + dy * half]
    lines.push(i % 2 ? line(to, from) : line(from, to))
  }
  return lines
}
