import { joinPaths } from '../../../vector/utils/join.js'

/**
 * Z-level clearing, top down: every `zStep` mm the whole area that has to go at least that
 * deep is cleared — in rings from its outline inwards, `stepover` apart, like a pocket.
 * The rings are the lines of equal distance to the area's edge (a distance map + marching
 * squares), so they follow its shape and never leave it.
 */
export default {
  id:     'waterline',
  label:  'Waterline',
  params: [
    { type: 'range', key: 'zStep',    label: 'Z step',   min: 0.1, max: 5, step: 0.1, default: 0.5, unit: ' mm' },
    { type: 'range', key: 'lineStep', label: 'Stepover', min: 0.1, max: 5, step: 0.1, default: 1,   unit: ' mm' },
  ],
  make: ({ w, h, k }, p, step) => {
    const maxDepth = p.maxDepth ?? 2
    const zStep    = Math.max(0.05, p.zStep ?? 0.5)
    const levels = []
    for (let z = zStep; z < maxDepth - 1e-6; z += zStep) levels.push(z)
    levels.push(maxDepth)

    const paths = []
    for (const z of levels) {
      const dist = distanceInside(k, w, h, z / maxDepth - 1e-6)
      let far = 0
      for (let i = 0; i < dist.length; i++) if (dist[i] > far) far = dist[i]
      const rings = []
      for (let t = 0.5; t < far; t += step) rings.push(t)
      for (const segs of isoLines(dist, w, h, rings, -z)) paths.push(...joinPaths(segs, 1e-6))
    }
    return { paths }
  },
}

/**
 * Per pixel of the area (depth ≥ level): the distance in px to the nearest pixel outside it —
 * 0 outside. Beyond the picture counts as outside. Two-pass chamfer (1 / √2), close enough
 * for ring spacing.
 */
function distanceInside(k, w, h, level) {
  const d = new Float32Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = k[i] >= level ? 1e9 : 0
  const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]
  const D = Math.SQRT2
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (d[i]) d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + D, at(x + 1, y - 1) + D)
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x
    if (d[i]) d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + D, at(x - 1, y + 1) + D)
  }
  return d
}

/**
 * Marching squares for several levels in one sweep: per level the line segments where the
 * grid crosses it, as [[x, y, z], [x, y, z]]. Beyond the grid counts as 0, so lines close.
 */
function isoLines(v, w, h, levels, z) {
  const out = levels.map(() => [])
  if (!levels.length) return out
  const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : v[y * w + x]
  for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
    const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1)
    const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d)
    if (hi < levels[0] || lo >= levels[levels.length - 1]) continue
    for (let li = 0; li < levels.length; li++) {
      const L = levels[li]
      if (L <= lo) continue
      if (L > hi) break
      const cross = (x0, y0, v0, x1, y1, v1) => { const t = (L - v0) / (v1 - v0); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z] }
      const T = () => cross(x, y, a, x + 1, y, b), R = () => cross(x + 1, y, b, x + 1, y + 1, c)
      const B = () => cross(x, y + 1, d, x + 1, y + 1, c), Lf = () => cross(x, y, a, x, y + 1, d)
      const segs = out[li]
      switch ((a >= L) | (b >= L) << 1 | (c >= L) << 2 | (d >= L) << 3) {
        case 1: case 14: segs.push([Lf(), T()]); break
        case 2: case 13: segs.push([T(), R()]); break
        case 3: case 12: segs.push([Lf(), R()]); break
        case 4: case 11: segs.push([R(), B()]); break
        case 6: case 9:  segs.push([T(), B()]); break
        case 7: case 8:  segs.push([Lf(), B()]); break
        case 5:  segs.push([Lf(), T()], [R(), B()]); break      // saddles
        case 10: segs.push([T(), R()], [B(), Lf()]); break
      }
    }
  }
  return out
}
