import { renderPaths } from './utils/renderPaths.js'

/**
 * SetZ — sets the Z value for every point in every contour.
 *
 * Use cases:
 *  - Add depth to flat contours (contours/skeleton) before GRBL: set Z to -1.5 mm
 *  - Reset terrain paths to a flat plane: set Z to 0
 */
export async function process(prev, params) {
  const z        = params.z ?? 0
  const contours = (prev.contours ?? []).map(c => c.map(p => [p[0], p[1], z]))

  const w = prev.bitmap?.width  ?? 0
  const h = prev.bitmap?.height ?? 0
  return { kind: 'image', bitmap: renderPaths(contours, w, h), contours }
}
