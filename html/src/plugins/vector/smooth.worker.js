import { renderPaths } from './utils/renderPaths.js'

export async function process(prev, params) {
  const radius = Math.max(1, params.window ?? 3)
  const passes = Math.max(1, params.passes ?? 1)

  let contours = prev.contours ?? []

  for (let p = 0; p < passes; p++) {
    contours = contours.map(contour => {
      if (contour.length < 3) return contour

      // Closed path: first and last point are the same (or sub-pixel apart)
      const isClosed = contour.length > 1 &&
        Math.abs(contour[0][0] - contour[contour.length - 1][0]) < 0.5 &&
        Math.abs(contour[0][1] - contour[contour.length - 1][1]) < 0.5

      // For closed paths work on the n-1 unique points with wrap-around indexing
      const pts = isClosed ? contour.slice(0, -1) : contour
      const n   = pts.length
      const out = []

      for (let i = 0; i < n; i++) {
        // Preserve endpoints of open paths so the path doesn't shrink inward
        if (!isClosed && (i === 0 || i === n - 1)) {
          out.push([pts[i][0], pts[i][1], pts[i][2] ?? 0])
          continue
        }
        let sx = 0, sy = 0, sz = 0, cnt = 0
        for (let di = -radius; di <= radius; di++) {
          const j = isClosed ? ((i + di) % n + n) % n : i + di
          if (j >= 0 && j < n) { sx += pts[j][0]; sy += pts[j][1]; sz += (pts[j][2] ?? 0); cnt++ }
        }
        out.push([sx / cnt, sy / cnt, sz / cnt])
      }

      if (isClosed) out.push([out[0][0], out[0][1], out[0][2] ?? 0])  // re-close
      return out
    })
  }

  const w = prev.bitmap?.width  ?? 0
  const h = prev.bitmap?.height ?? 0
  return { kind: 'image', bitmap: renderPaths(contours, w, h), contours }
}
