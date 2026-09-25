/**
 * ImageBitmap ⇄ data URL, and scaling pictures down to a manageable size.
 */

export async function bitmapToDataUrl(bmp, type = 'image/jpeg', quality = 0.9) {
  const canvas = new OffscreenCanvas(bmp.width, bmp.height)
  canvas.getContext('2d').drawImage(bmp, 0, 0)
  const blob = await canvas.convertToBlob({ type, quality })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBitmap(url) {
  return createImageBitmap(await (await fetch(url)).blob())
}

/** Scales `bmp` down so its longer side is at most `maxSide` (closes the original if it does). */
export async function fitBitmap(bmp, maxSide) {
  const scale = maxSide / Math.max(bmp.width, bmp.height)
  if (scale >= 1) return bmp
  const small = await createImageBitmap(bmp, {
    resizeWidth:   Math.round(bmp.width * scale),
    resizeHeight:  Math.round(bmp.height * scale),
    resizeQuality: 'high',
  })
  bmp.close()
  return small
}
