import { renderPaths } from './utils/renderPaths.js'
import { joinPaths }   from './utils/join.js'

/**
 * Join paths — connects paths whose ENDS almost touch (≤ maxGap mm) into one path.
 * Only start and end points count: a path starting somewhere in the middle of another stays apart.
 *
 * The closest pairs of ends are joined first; every end joins at most once, so where three or more
 * ends meet only the two closest connect. A path may be reversed to fit, and a path whose own ends
 * almost touch is closed. Ends at different depths are joined by a slope.
 */
export async function process(prev, params) {
  const contours = prev.contours ?? []
  const w = prev.bitmap?.width ?? 0, h = prev.bitmap?.height ?? 0
  const gap = (params.maxGap ?? 0.5) / (prev.meta?.mmPerPixel ?? 1)   // in the paths' units (px)

  const out = joinPaths(contours, gap)
  return { kind: 'image', bitmap: renderPaths(out, w, h), contours: out }
}
