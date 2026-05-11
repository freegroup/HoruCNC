export async function process(prev, params) {
  const bitmap = prev.bitmap

  // Center-crop to square
  const side = Math.min(bitmap.width, bitmap.height)
  const sx   = Math.round((bitmap.width  - side) / 2)
  const sy   = Math.round((bitmap.height - side) / 2)

  const physicalWidth = params.physicalWidth ?? 100
  const dpi           = params.dpi ?? 254
  // Clamp to native resolution — upscaling adds no real detail
  const size = Math.max(16, Math.min(Math.round(dpi * physicalWidth / 25.4), side))

  const canvas = new OffscreenCanvas(size, size)
  const ctx    = canvas.getContext('2d')

  if (params.flipH) {
    ctx.translate(size, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)

  const mmPerPixel  = physicalWidth / size
  const nativeDpi   = Math.round(side * 25.4 / physicalWidth)

  return {
    pluginId: 'camera',
    kind:     'image',
    bitmap:   canvas.transferToImageBitmap(),
    meta:     { mmPerPixel, physicalWidth, nativeDpi },
  }
}
