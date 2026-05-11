import { renderPaths } from './utils/renderPaths.js'

export async function process(prev) {
  const input  = [...(prev.contours ?? [])]
  const sorted = []
  let cx = 0, cy = 0

  while (input.length) {
    let best = 0, bestDist = Infinity
    for (let i = 0; i < input.length; i++) {
      const [sx, sy] = input[i][0] ?? [0, 0]
      const d = (sx - cx) ** 2 + (sy - cy) ** 2
      if (d < bestDist) { bestDist = d; best = i }
    }
    const contour = input.splice(best, 1)[0]
    sorted.push(contour)
    const last = contour[contour.length - 1] ?? [0, 0]
    cx = last[0]; cy = last[1]
  }

  const w = prev.bitmap?.width  ?? 0
  const h = prev.bitmap?.height ?? 0
  return { kind: 'image', bitmap: renderPaths(sorted, w, h), contours: sorted }
}
