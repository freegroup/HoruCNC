import { renderPaths } from './utils/renderPaths.js'

function perpDistance(pt, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return Math.sqrt((pt[0] - a[0]) ** 2 + (pt[1] - a[1]) ** 2)
  return Math.abs(dy * pt[0] - dx * pt[1] + b[0] * a[1] - b[1] * a[0]) / len
}

function ramerDouglasPeucker(points, epsilon) {
  if (points.length <= 2) return points
  let maxD = 0, maxI = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], points[0], points[points.length - 1])
    if (d > maxD) { maxD = d; maxI = i }
  }
  if (maxD > epsilon) {
    const left  = ramerDouglasPeucker(points.slice(0, maxI + 1), epsilon)
    const right = ramerDouglasPeucker(points.slice(maxI), epsilon)
    return [...left.slice(0, -1), ...right]
  }
  return [points[0], points[points.length - 1]]
}

export async function process(prev, params) {
  const epsilon  = params.epsilon ?? 2
  const contours = (prev.contours ?? []).map(c => ramerDouglasPeucker(c, epsilon))
  const w = prev.bitmap?.width  ?? 0
  const h = prev.bitmap?.height ?? 0
  return { kind: 'image', bitmap: renderPaths(contours, w, h), contours }
}
