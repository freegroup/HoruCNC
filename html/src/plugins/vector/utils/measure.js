/**
 * Measuring paths. Points are [x, y, z]: x, y in pixels (meta.mmPerPixel turns them into mm),
 * z the machine Z in mm — 0 = stock surface, negative = into the material.
 */
const EPS = 0.01

/** The extent in pixels: { x0, y0, x1, y1 }, or null if there are no points. */
export function pathBounds(contours) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const c of contours) for (const p of c) {
    if (p[0] < x0) x0 = p[0]
    if (p[0] > x1) x1 = p[0]
    if (p[1] < y0) y0 = p[1]
    if (p[1] > y1) y1 = p[1]
  }
  return x0 <= x1 ? { x0, y0, x1, y1 } : null
}

/** Deepest point of all paths, as a positive depth in mm (0 = flat 2D paths). */
export function pathDepth(contours) {
  let d = 0
  for (const c of contours ?? []) for (const p of c) {
    const z = p[2]
    if (Number.isFinite(z) && -z > d) d = -z
  }
  return d > EPS ? d : 0
}

/** The factor that brings the deepest point to `depth` mm — 1 for flat paths or no depth. */
export function depthFactor(contours, depth) {
  const d = pathDepth(contours)
  return depth > 0 && d > 0 ? depth / d : 1
}

/** The size of a step result's paths in mm: { w, h, d } (d = depth), or null. */
export function pathSizeMm(result) {
  const contours = result?.contours ?? []
  const b   = pathBounds(contours)
  const mpp = result?.meta?.mmPerPixel
  return b && mpp ? { w: (b.x1 - b.x0) * mpp, h: (b.y1 - b.y0) * mpp, d: pathDepth(contours) } : null
}
