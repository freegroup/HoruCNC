export async function process(prev, params) {
  const bitmap = prev.bitmap

  // The whole picture, never cropped. "Field width" is its width in mm; the height follows
  // from the picture's proportions.
  const physicalWidth = params.physicalWidth ?? 100
  const dpi           = params.dpi ?? 254
  // Clamp to native resolution — upscaling adds no real detail
  const width  = Math.max(16, Math.min(Math.round(dpi * physicalWidth / 25.4), bitmap.width))
  const height = Math.max(1, Math.round(width * bitmap.height / bitmap.width))

  const canvas = new OffscreenCanvas(width, height)
  const ctx    = canvas.getContext('2d')

  if (params.flipH) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(bitmap, 0, 0, width, height)

  const mmPerPixel  = physicalWidth / width
  const nativeDpi   = Math.round(bitmap.width * 25.4 / physicalWidth)

  return {
    pluginId: 'source',
    kind:     'image',
    bitmap:   canvas.transferToImageBitmap(),
    meta:     { mmPerPixel, physicalWidth, nativeDpi },
  }
}
