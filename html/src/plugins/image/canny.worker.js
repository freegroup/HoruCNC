export async function process(prev, params) {
  const bitmap = prev.bitmap
  const w = bitmap.width, h = bitmap.height
  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)

  const src = ctx.getImageData(0, 0, w, h)
  const d   = src.data

  // Step 1 — Grayscale
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++)
    gray[i] = 0.299 * d[i*4] + 0.587 * d[i*4+1] + 0.114 * d[i*4+2]

  // Step 2 — Box blur
  const radius  = Math.max(1, Math.floor((params.blur ?? 3) / 2))
  const blurred = boxBlur(gray, w, h, radius)

  // Step 3 — Sobel gradient magnitude + quantised direction
  const mag = new Float32Array(w * h)
  const dir = new Uint8Array(w * h)   // 0=0° 1=45° 2=90° 3=135°

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = (
        -blurred[(y-1)*w+(x-1)] - 2*blurred[y*w+(x-1)] - blurred[(y+1)*w+(x-1)] +
         blurred[(y-1)*w+(x+1)] + 2*blurred[y*w+(x+1)] + blurred[(y+1)*w+(x+1)]
      )
      const gy = (
        -blurred[(y-1)*w+(x-1)] - 2*blurred[(y-1)*w+x] - blurred[(y-1)*w+(x+1)] +
         blurred[(y+1)*w+(x-1)] + 2*blurred[(y+1)*w+x] + blurred[(y+1)*w+(x+1)]
      )
      mag[y*w+x] = Math.sqrt(gx*gx + gy*gy)

      let a = Math.atan2(gy, gx) * 180 / Math.PI
      if (a < 0) a += 180
      dir[y*w+x] = a < 22.5 || a >= 157.5 ? 0 : a < 67.5 ? 1 : a < 112.5 ? 2 : 3
    }
  }

  // Step 4 — Non-Maximum Suppression → thins edges to 1 px
  const nms = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y*w+x, m = mag[i]
      let n1, n2
      switch (dir[i]) {
        case 0: n1 = mag[y*w+(x-1)];     n2 = mag[y*w+(x+1)];     break
        case 1: n1 = mag[(y-1)*w+(x-1)]; n2 = mag[(y+1)*w+(x+1)]; break
        case 2: n1 = mag[(y-1)*w+x];     n2 = mag[(y+1)*w+x];     break
        case 3: n1 = mag[(y-1)*w+(x+1)]; n2 = mag[(y+1)*w+(x-1)]; break
      }
      nms[i] = (m >= n1 && m >= n2) ? m : 0
    }
  }

  // Step 5 — Double threshold
  const tLow  = params.threshLow  ?? 80
  const tHigh = params.threshHigh ?? 160
  const edges = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if      (nms[i] >= tHigh) edges[i] = 255   // strong
    else if (nms[i] >= tLow)  edges[i] = 128   // weak
  }

  // Step 6 — Hysteresis: weak edges survive only if connected to a strong edge
  const visited = new Uint8Array(w * h)
  const stack   = []
  for (let i = 0; i < w * h; i++) {
    if (edges[i] === 255 && !visited[i]) { visited[i] = 1; stack.push(i) }
  }
  while (stack.length) {
    const i = stack.pop()
    const x = i % w, y = (i / w) | 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = x+dx, ny = y+dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
        const ni = ny*w+nx
        if (!visited[ni] && edges[ni] === 128) {
          edges[ni] = 255; visited[ni] = 1; stack.push(ni)
        }
      }
    }
  }

  // Output — only confirmed strong edges, all others black
  const out = ctx.createImageData(w, h)
  for (let i = 0; i < w * h; i++) {
    const v = edges[i] === 255 ? 255 : 0
    out.data[i*4] = out.data[i*4+1] = out.data[i*4+2] = v
    out.data[i*4+3] = 255
  }

  ctx.putImageData(out, 0, 0)
  return { pluginId: 'canny', kind: 'image', bitmap: canvas.transferToImageBitmap() }
}

function boxBlur(buf, w, h, r) {
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const ny = y+dy, nx = x+dx
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) { sum += buf[ny*w+nx]; count++ }
        }
      }
      out[y*w+x] = sum / count
    }
  }
  return out
}
