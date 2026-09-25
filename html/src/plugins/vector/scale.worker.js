import { renderPaths } from './utils/renderPaths.js'
import { pathBounds, depthFactor } from './utils/measure.js'

/**
 * Scale — sets the size of the paths in mm: width, height and depth.
 *
 * The size of a pixel (meta.mmPerPixel) takes the larger of the two factors, so with the
 * proportions kept no point moves at all — lossless. Only with width and height on their own
 * is the other axis squeezed in the points, by the ratio of the two factors (≤ 1, so the paths
 * never outgrow the picture). The depth scales every z by the same factor.
 */
export async function process(prev, params) {
  const contours = prev.contours ?? []
  const mpp = prev.meta?.mmPerPixel
  const b   = pathBounds(contours)
  const w = prev.bitmap?.width ?? 0, h = prev.bitmap?.height ?? 0
  const { sx, sy } = factors(params.size, b, mpp)
  const sz = depthFactor(contours, params.size?.d)
  if (sx === 1 && sy === 1 && sz === 1) return { kind: 'image', bitmap: renderPaths(contours, w, h), contours }

  const k = Math.max(sx, sy), fx = sx / k, fy = sy / k
  const out = fx === 1 && fy === 1 && sz === 1 ? contours
    : contours.map(c => c.map(p => [b.x0 + (p[0] - b.x0) * fx, b.y0 + (p[1] - b.y0) * fy, (p[2] ?? 0) * sz]))
  return { kind: 'image', bitmap: renderPaths(out, w, h), contours: out, meta: { mmPerPixel: mpp * k } }
}


/** The scale per axis for size { w, h, locked } — 1 where nothing is set (or nothing to scale). */
function factors(size, b, mpp) {
  if (!size || !b || !mpp) return { sx: 1, sy: 1 }
  const cw = (b.x1 - b.x0) * mpp, ch = (b.y1 - b.y0) * mpp
  const fx = size.w > 0 && cw > 0 ? size.w / cw : null
  const fy = size.h > 0 && ch > 0 ? size.h / ch : null
  if (size.locked) { const s = fx ?? fy ?? 1; return { sx: s, sy: s } }
  return { sx: fx ?? 1, sy: fy ?? 1 }
}
