import { renderPaths } from './utils/renderPaths.js'

export async function process(prev, params) {
  const minPoints = params.minPoints ?? 20
  const contours  = (prev.contours ?? []).filter(c => c.length >= minPoints)
  const w = prev.bitmap?.width  ?? 0
  const h = prev.bitmap?.height ?? 0
  return { kind: 'image', bitmap: renderPaths(contours, w, h), contours }
}
