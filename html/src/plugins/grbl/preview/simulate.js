/**
 * Z-map simulation of the milled piece — ported from PatternMaster (js/simulator.js).
 * Height field (Float32Array, 0 = surface, negative = cut). Every cutting segment stamps a
 * "swept capsule" of the tool profile: H = min(H, z_tip + profile(d)).
 */

/** Tool profile f(d): how far above the tip the cutter's surface is at distance d from its axis. */
export function toolProfile({ type, diameter, angle = 90, corner = 1 }) {
  const r = diameter / 2
  switch (type) {
    case 'ball':
      return { radius: r, profile: d => r - Math.sqrt(Math.max(0, r * r - d * d)) }
    case 'vee': {
      const k = 1 / Math.tan((angle / 2) * Math.PI / 180)
      return { radius: r, profile: d => d * k }
    }
    case 'torus': {
      const cr = Math.min(corner, r), flat = r - cr
      return { radius: r, profile: d => {
        if (d <= flat) return 0
        const dd = d - flat
        return cr - Math.sqrt(Math.max(0, cr * cr - dd * dd))
      } }
    }
    default:
      return { radius: r, profile: () => 0 }
  }
}

export const LUT_N = 4096

/** Profile sampled over d in [0, R] — lets the kernel run without closures (in a worker). */
export function toolLUT(tool) {
  const lut = new Float32Array(LUT_N)
  for (let i = 0; i < LUT_N; i++) lut[i] = tool.profile(i / (LUT_N - 1) * tool.radius)
  return lut
}

/**
 * Cutting segments of a packed move list ([rapid, x, y, z] × n), shifted by (ox, oy) into the
 * grid's coordinates. Rapids are skipped — they run above the material.
 */
export function cutSegments(moves, ox, oy) {
  const n = moves.length / 4
  const segs = new Float32Array(n * 6)
  let k = 0
  for (let i = 1; i < n; i++) {
    if (moves[i * 4] === 1) continue
    const a = (i - 1) * 4, b = i * 4
    segs[k++] = moves[a + 1] - ox; segs[k++] = moves[a + 2] - oy; segs[k++] = moves[a + 3]
    segs[k++] = moves[b + 1] - ox; segs[k++] = moves[b + 2] - oy; segs[k++] = moves[b + 3]
  }
  return segs.subarray(0, k)
}

/** Stamp kernel — same math as PatternMaster's simStampKernel incl. the zFloor early-out. */
export function stamp(H, segs, nx, ny, cell, R, lut) {
  const lutN = lut.length
  const R2 = R * R, invStep = (lutN - 1) / R
  const count = segs.length / 6
  for (let s = 0; s < count; s++) {
    const o = s * 6
    const x0 = segs[o], y0 = segs[o + 1], z0 = segs[o + 2]
    const x1 = segs[o + 3], y1 = segs[o + 4], z1 = segs[o + 5]
    if (z0 >= 0 && z1 >= 0) continue                       // above the surface — cuts nothing
    const ix0 = Math.max(0, Math.floor((Math.min(x0, x1) - R) / cell)), ix1 = Math.min(nx - 1, Math.ceil((Math.max(x0, x1) + R) / cell))
    const iy0 = Math.max(0, Math.floor((Math.min(y0, y1) - R) / cell)), iy1 = Math.min(ny - 1, Math.ceil((Math.max(y0, y1) + R) / cell))
    if (ix1 < ix0 || iy1 < iy0) continue
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, dz = z1 - z0
    const zFloor = Math.min(z0, z1)
    for (let iy = iy0; iy <= iy1; iy++) {
      const py = iy * cell, row = iy * nx
      for (let ix = ix0; ix <= ix1; ix++) {
        const px = ix * cell
        let t = L2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / L2 : 0
        t = t < 0 ? 0 : (t > 1 ? 1 : t)
        const ex = px - (x0 + dx * t), ey = py - (y0 + dy * t), d2 = ex * ex + ey * ey
        if (d2 > R2) continue
        const k = row + ix
        if (H[k] <= zFloor) continue                       // already deeper — nothing to change
        const f = Math.sqrt(d2) * invStep
        let li = f | 0; if (li >= lutN - 1) li = lutN - 2
        const z = (z0 + dz * t) + lut[li] + (lut[li + 1] - lut[li]) * (f - li)
        if (z < H[k]) H[k] = z
      }
    }
  }
}

/**
 * The stock: the paths' extent plus the tool radius and a margin, so the cut edges are
 * visible. In G-code coordinates (mm), z not included.
 */
export function stockFor(moves, radius) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < moves.length; i += 4) {
    if (moves[i] === 1 && moves[i + 3] >= 0) continue      // rapids in the air don't count
    const x = moves[i + 1], y = moves[i + 2]
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 10 }
  const m = radius + Math.max(2, 0.04 * Math.max(maxX - minX, maxY - minY))
  return { x: minX - m, y: minY - m, w: maxX - minX + 2 * m, h: maxY - minY + 2 * m }
}
