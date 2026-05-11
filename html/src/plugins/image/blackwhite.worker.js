export async function process(prev, params) {
  const bitmap = prev.bitmap
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx    = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d         = imageData.data
  const threshold = params.threshold ?? 128
  const invert    = params.invert    ?? false

  for (let i = 0; i < d.length; i += 4) {
    const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    let v = luma >= threshold ? 255 : 0
    if (invert) v = 255 - v
    d[i] = d[i + 1] = d[i + 2] = v
  }

  ctx.putImageData(imageData, 0, 0)
  return { pluginId: 'blackwhite', kind: 'image', bitmap: canvas.transferToImageBitmap() }
}
