export async function process(prev, params) {
  const bitmap = prev.bitmap
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data

  let min = 255, max = 0
  const gray = new Uint8Array(d.length / 4)
  for (let i = 0, g = 0; i < d.length; i += 4, g++) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    gray[g] = v
    if (v < min) min = v
    if (v > max) max = v
  }

  const range = max - min || 1
  for (let i = 0, g = 0; i < d.length; i += 4, g++) {
    let v = params.autoLevels ? ((gray[g] - min) / range) * 255 : gray[g]
    if (params.invert) v = 255 - v
    d[i] = d[i + 1] = d[i + 2] = v
  }

  ctx.putImageData(imageData, 0, 0)
  return { pluginId: 'grayscale', kind: 'image', bitmap: canvas.transferToImageBitmap() }
}
