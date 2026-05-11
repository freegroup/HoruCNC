/**
 * Render contours as connected-path preview on an OffscreenCanvas.
 * @param {number[][][]} contours
 * @param {number} width
 * @param {number} height
 * @returns {ImageBitmap}
 */
export function renderPaths(contours, width, height) {
  const w = Math.max(width,  1)
  const h = Math.max(height, 1)
  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = '#0a0a10'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = '#f0a030'
  ctx.lineWidth   = 1
  ctx.lineJoin    = 'round'
  ctx.lineCap     = 'round'

  for (const contour of contours) {
    if (contour.length < 2) continue
    ctx.beginPath()
    ctx.moveTo(contour[0][0], contour[0][1])
    for (let i = 1; i < contour.length; i++) ctx.lineTo(contour[i][0], contour[i][1])
    ctx.stroke()
  }

  ctx.fillStyle = '#4488ff'
  for (const contour of contours) {
    if (!contour.length) continue
    ctx.beginPath()
    ctx.arc(contour[0][0], contour[0][1], 2, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas.transferToImageBitmap()
}
