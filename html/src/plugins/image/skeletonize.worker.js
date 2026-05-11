/**
 * Zhang-Suen Thinning — reduces thick binary foreground regions to a 1px-wide
 * skeleton while preserving topology.
 *
 * Use case: thick shapes (text, filled regions) → centerline → Contours/Skeleton
 * Contrast with Canny which already produces thin edges and needs no thinning.
 *
 * Algorithm: iterative two-sub-pass removal of border pixels under the
 * Zhang-Suen conditions until no more pixels can be removed.
 */
export async function process(prev, params) {
  const bitmap = prev.bitmap
  const w = bitmap.width, h = bitmap.height
  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)

  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data

  const fg = new Uint8Array(w * h)
  for (let i = 0, p = 0; p < d.length; i++, p += 4)
    fg[i] = d[p] >= 128 ? 1 : 0

  const toRemove = new Uint8Array(w * h)

  let changed = true
  while (changed) {
    changed = false

    // Sub-iteration 1 & 2 — only conditions on P2*P4*P6 and P4*P6*P8 differ
    for (let sub = 0; sub < 2; sub++) {
      toRemove.fill(0)

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!fg[y * w + x]) continue

          const p2 = fg[(y-1)*w+  x  ]
          const p3 = fg[(y-1)*w+(x+1)]
          const p4 = fg[  y  *w+(x+1)]
          const p5 = fg[(y+1)*w+(x+1)]
          const p6 = fg[(y+1)*w+  x  ]
          const p7 = fg[(y+1)*w+(x-1)]
          const p8 = fg[  y  *w+(x-1)]
          const p9 = fg[(y-1)*w+(x-1)]

          const B = p2+p3+p4+p5+p6+p7+p8+p9
          if (B < 2 || B > 6) continue

          // Count 0→1 transitions in cyclic sequence P2…P9
          let A = 0
          if (!p2 && p3) A++; if (!p3 && p4) A++
          if (!p4 && p5) A++; if (!p5 && p6) A++
          if (!p6 && p7) A++; if (!p7 && p8) A++
          if (!p8 && p9) A++; if (!p9 && p2) A++
          if (A !== 1) continue

          if (sub === 0) {
            if (p2 * p4 * p6) continue
            if (p4 * p6 * p8) continue
          } else {
            if (p2 * p4 * p8) continue
            if (p2 * p6 * p8) continue
          }

          toRemove[y * w + x] = 1
          changed = true
        }
      }

      for (let i = 0; i < w * h; i++) if (toRemove[i]) fg[i] = 0
    }
  }

  for (let i = 0, p = 0; p < d.length; i++, p += 4) {
    const v = fg[i] ? 255 : 0
    d[p] = d[p+1] = d[p+2] = v
    d[p+3] = 255
  }
  ctx.putImageData(imageData, 0, 0)

  return { pluginId: 'skeletonize', kind: 'image', bitmap: canvas.transferToImageBitmap() }
}
