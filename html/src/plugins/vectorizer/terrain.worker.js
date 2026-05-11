import { renderPaths } from '../vector/utils/renderPaths.js'

/**
 * Terrain vectorizer — converts a grayscale image into a 3D raster toolpath.
 *
 * Scan lines run at `angle` degrees. Each line samples pixel brightness and
 * maps it to Z depth:
 *   black (0)   → -maxDepth mm  (deepest cut)
 *   white ≥ threshold → skipped (no cut)
 *
 * Boustrophedon (zigzag) scan for efficient toolpath ordering.
 */
export async function process(prev, params) {
  const bitmap = prev.bitmap
  const w = bitmap.width, h = bitmap.height
  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const d = ctx.getImageData(0, 0, w, h).data

  const maxDepth  = params.maxDepth  ?? 2.0
  const mmPerPixel = prev.meta?.mmPerPixel ?? 1
  const lineStep  = Math.max(1, Math.round((params.lineStep ?? 1.0) / mmPerPixel))
  const threshold = Math.min(255, Math.max(1, params.threshold ?? 240))
  const angle     = ((params.angle ?? 0) * Math.PI) / 180

  // Scan direction unit vector and perpendicular step vector
  const sdx =  Math.cos(angle), sdy =  Math.sin(angle)
  const pdx = -Math.sin(angle), pdy =  Math.cos(angle)

  const cx   = w / 2, cy = h / 2
  const diag = Math.ceil(Math.sqrt(w * w + h * h) / 2)

  const contours  = []
  let   lineIndex = 0

  for (let t = -diag; t <= diag; t += lineStep, lineIndex++) {
    const forward = (lineIndex & 1) === 0
    const bx = cx + t * pdx
    const by = cy + t * pdy

    let segment = []

    for (let si = 0; si <= diag * 2; si++) {
      const s  = forward ? (-diag + si) : (diag - si)
      const px = bx + s * sdx
      const py = by + s * sdy

      // Out of image bounds → flush segment
      if (px < 0 || px >= w || py < 0 || py >= h) {
        if (segment.length >= 2) { contours.push(segment) }
        segment = []
        continue
      }

      const brightness = d[(Math.round(py) * w + Math.round(px)) * 4]

      if (brightness >= threshold) {
        if (segment.length >= 2) { contours.push(segment) }
        segment = []
        continue
      }

      const z = -(maxDepth * (threshold - brightness) / threshold)
      segment.push([px, py, z])
    }

    if (segment.length >= 2) contours.push(segment)
  }

  console.log(`[Terrain] ${contours.length} scan lines  angle=${params.angle ?? 0}°  ${w}×${h}`)

  return {
    pluginId: 'terrain',
    kind:     'image',
    bitmap:   renderPaths(contours, w, h),
    contours,
  }
}
