/**
 * Joining paths at their ends. The ends are numbered: 2i is the start of path i, 2i + 1 its end.
 *   joinPaths(paths, gap)       — joins ends that lie within `gap` (the paths' units)
 *   chainPaths(paths, partner)  — chains paths along given pairs of ends (partner[end] = end | -1)
 */

/**
 * Joins paths whose ENDS lie within `gap` of each other into longer paths. Only start and end
 * points count. The closest pairs of ends are joined first and every end joins at most once, so
 * where three or more ends meet only the two closest connect. A path may be reversed to fit; a
 * path whose own ends almost touch is closed. Points keep their z.
 */
export function joinPaths(paths, gap) {
  return gap > 0 ? join(paths, gap) : paths
}

// End e of path e >> 1: even = its start, odd = its end
const pointOf = (paths, e) => { const c = paths[e >> 1]; return e & 1 ? c[c.length - 1] : c[0] }
const dist    = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const isClosed = c => c.length > 2 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]

function join(paths, gap) {
  const n = paths.length
  const open = i => paths[i].length >= 2 && !isClosed(paths[i])

  // Candidate pairs of ends within the gap — found through a grid of gap-sized cells
  const grid = new Map()
  const key  = (cx, cy) => `${cx},${cy}`
  for (let e = 0; e < 2 * n; e++) {
    if (!open(e >> 1)) continue
    const [x, y] = pointOf(paths, e)
    const k = key(Math.floor(x / gap), Math.floor(y / gap))
    if (!grid.has(k)) grid.set(k, [])
    grid.get(k).push(e)
  }
  const pairs = []
  for (let a = 0; a < 2 * n; a++) {
    if (!open(a >> 1)) continue
    const pa = pointOf(paths, a)
    const cx = Math.floor(pa[0] / gap), cy = Math.floor(pa[1] / gap)
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const b of grid.get(key(cx + dx, cy + dy)) ?? []) {
        if (b <= a) continue
        if (b >> 1 === a >> 1 && paths[a >> 1].length < 3) continue   // a 2-point path can't close
        const d = dist(pa, pointOf(paths, b))
        if (d <= gap) pairs.push([d, a, b])
      }
    }
  }
  if (!pairs.length) return paths

  // Closest first; every end is used once
  pairs.sort((p, q) => p[0] - q[0])
  const partner = new Int32Array(2 * n).fill(-1)
  for (const [, a, b] of pairs) {
    if (partner[a] !== -1 || partner[b] !== -1) continue
    partner[a] = b; partner[b] = a
  }

  return chainPaths(paths, partner)
}

/**
 * Chains paths into longer ones along pairs of ends: from a free end through the paired ends
 * (reversing a path where needed); chains that come back to where they started are closed.
 */
export function chainPaths(paths, partner) {
  const n    = paths.length
  const used = new Uint8Array(n)
  const out  = []
  const walk = startEnd => {
    const pts = []
    let e = startEnd
    while (true) {
      const i = e >> 1
      used[i] = 1
      const c = e & 1 ? [...paths[i]].reverse() : paths[i]            // enter at e, leave at e ^ 1
      const last = pts[pts.length - 1]
      pts.push(...(last && dist(last, c[0]) === 0 ? c.slice(1) : c))
      const next = partner[e ^ 1]
      if (next === -1) break
      if (used[next >> 1]) {                                          // back where it started: a loop
        if (dist(pts[pts.length - 1], pts[0]) > 0) pts.push(pts[0])
        break
      }
      e = next
    }
    out.push(pts)
  }
  for (let i = 0; i < n; i++) {
    if (used[i]) continue
    if (partner[2 * i] === -1)       walk(2 * i)
    else if (partner[2 * i + 1] === -1) walk(2 * i + 1)
  }
  for (let i = 0; i < n; i++) if (!used[i]) walk(2 * i)                // loops: no free end
  return out
}
