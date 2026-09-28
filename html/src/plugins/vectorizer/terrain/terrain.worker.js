import { renderPaths }             from '../../vector/utils/renderPaths.js'
import { depthField, cutAlong }    from './field.js'
import { strategyById, ownValues } from './strategies/index.js'

/**
 * Terrain — the chosen strategy makes point sequences over the picture; along each, the runs
 * that get milled become paths at their depth (darker is deeper). A strategy that returns
 * `{ paths }` has made finished paths itself.
 */
export async function process(prev, params) {
  const strategy = strategyById(params.strategy)
  const p        = { maxDepth: params.maxDepth ?? 2, ...ownValues(strategy, params) }
  const field    = depthField(prev.bitmap, params.threshold ?? 240)
  const step     = Math.max(1, (p.lineStep ?? 1) / (prev.meta?.mmPerPixel ?? 1))   // px
  const made     = strategy.make(field, p, step)
  const contours = made.paths ?? made.flatMap(pts => cutAlong(field, pts, p.maxDepth))
  return { kind: 'image', bitmap: renderPaths(contours, field.w, field.h), contours }
}
