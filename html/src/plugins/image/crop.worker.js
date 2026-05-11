export async function process(prev, params) {
  const bitmap = prev.bitmap
  const w = bitmap.width
  const h = bitmap.height

  const left   = Math.round(w * (params.leftCut   ?? 0) / 100)
  const right  = Math.round(w * (params.rightCut  ?? 0) / 100)
  const top    = Math.round(h * (params.topCut    ?? 0) / 100)
  const bottom = Math.round(h * (params.bottomCut ?? 0) / 100)

  const cw = Math.max(1, w - left - right)
  const ch = Math.max(1, h - top  - bottom)

  const canvas = new OffscreenCanvas(cw, ch)
  const ctx    = canvas.getContext('2d')
  ctx.drawImage(bitmap, -left, -top)

  return { kind: 'image', bitmap: canvas.transferToImageBitmap() }
}
