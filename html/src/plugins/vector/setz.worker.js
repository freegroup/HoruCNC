import { renderPaths } from './utils/renderPaths.js'
import { depthFactor } from './utils/measure.js'

/**
 * Z depth — how deep the paths go (depths in mm, positive; z is machine Z, negative = into
 * the material):
 *   set    every point at `depth`
 *   clamp  every depth kept between `minDepth` and `maxDepth`
 *   scale  every z scaled by one factor, so the deepest point ends up at `depth`
 */
export async function process(prev, params) {
  const contours = prev.contours ?? []
  const zOf = zFunction(params, contours)
  const out = contours.map(c => c.map(p => [p[0], p[1], zOf(p[2] ?? 0)]))

  const w = prev.bitmap?.width  ?? 0
  const h = prev.bitmap?.height ?? 0
  return { kind: 'image', bitmap: renderPaths(out, w, h), contours: out }
}

function zFunction({ mode = 'set', depth = 1.5, minDepth = 0, maxDepth = 3 }, contours) {
  if (mode === 'clamp') {
    const lo = Math.min(minDepth, maxDepth), hi = Math.max(minDepth, maxDepth)
    return z => -Math.min(hi, Math.max(lo, -z))
  }
  if (mode === 'scale') {
    const f = depthFactor(contours, depth)
    return z => z * f
  }
  return () => -depth
}
