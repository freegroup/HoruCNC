import { renderPaths } from '../vector/utils/renderPaths.js'
import { chainPaths }  from '../vector/utils/join.js'
import { inkMask }     from '../image/utils/ink.js'

/**
 * Centerline — turns 1px ink lines (Line thinning output) into single paths down their middle.
 *
 * The lines are read as a graph instead of being walked pixel by pixel:
 *  1. Staircase pixels are removed where that keeps the shape (Yokoi simple points),
 *     so steps become clean diagonals.
 *  2. Ends and crossings are the nodes; every line between two nodes is traced as one piece.
 *  3. Tiny side twigs at crossings (thinning leftovers) are dropped.
 *  4. Pieces go on into each other at the nodes — at a crossing the straightest ones.
 *  5. Every path is smoothed, its ends stay where they are.
 */
export async function process(prev, params) {
  const bitmap = prev.bitmap
  const w = bitmap.width, h = bitmap.height
  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)

  const minLen = params.minContour ?? 1
  const z      = -(params.depth ?? 1.5)   // cutting depth — machine Z, into the material
  const paths  = centerlines(inkMask(ctx.getImageData(0, 0, w, h).data), w, h, { smooth: params.smooth ?? 3 })
  const contours = paths.filter(p => p.length >= minLen).map(p => p.map(([x, y]) => [x, y, z]))

  return { kind: 'image', bitmap: renderPaths(contours, w, h), contours }
}

// The 8 neighbours in ring order, from east; even indices are the 4-neighbours
const RING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
const SPUR = 3            // side twigs up to this many pixels are thinning leftovers

/** Centerline paths ([x, y] in pixels) of a 1px-wide ink mask. The mask is changed. */
export function centerlines(fg, w, h, { smooth = 3 } = {}) {
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && fg[y * w + x] === 1
  const nb = i => {
    const x = i % w, y = (i / w) | 0, out = []
    for (const [dx, dy] of RING) if (on(x + dx, y + dy)) out.push((y + dy) * w + x + dx)
    return out
  }
  const xy = i => [i % w, (i / w) | 0]

  removeStairs(fg, w, h, on)

  // Nodes: pixels that are no plain line pixel (ends, crossings); touching ones form one node
  const deg = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) if (fg[i]) deg[i] = nb(i).length
  const node = new Int32Array(w * h).fill(-1)
  const nodes = []                                   // { pixels, at: [x, y], end }
  for (let i = 0; i < w * h; i++) {
    if (!fg[i] || deg[i] === 2 || node[i] !== -1) continue
    const id = nodes.length, pixels = [i]
    node[i] = id
    for (let k = 0; k < pixels.length; k++)
      for (const n of nb(pixels[k])) if (deg[n] !== 2 && node[n] === -1) { node[n] = id; pixels.push(n) }
    const at = pixels.reduce((s, p) => [s[0] + xy(p)[0] / pixels.length, s[1] + xy(p)[1] / pixels.length], [0, 0])
    nodes.push({ pixels, at, end: pixels.length === 1 && deg[i] === 1 })
  }

  // Edges: every line between two nodes, traced once
  const seen  = new Uint8Array(w * h)
  const pairs = new Set()
  const edges = []                                   // { pts, a, b } — a, b node ids (b -1: open end)
  const trace = (a, from, first) => {
    const pts = [nodes[a].at, xy(first)]
    seen[first] = 1
    let prev = from, cur = first
    while (true) {
      const next = nb(cur).filter(n => n !== prev)
      const hit  = next.find(n => node[n] !== -1 && !(node[n] === a && pts.length <= 2))
      if (hit !== undefined) { pts.push(nodes[node[hit]].at); return { pts, a, b: node[hit] } }
      const n = next.find(n => node[n] === -1 && !seen[n])
      if (n === undefined) return pts.length > 2 ? { pts, a, b: -1 } : null
      seen[n] = 1; pts.push(xy(n)); prev = cur; cur = n
    }
  }
  nodes.forEach(({ pixels }, a) => {
    for (const p of pixels) for (const q of nb(p)) {
      const b = node[q]
      if (b === a) continue
      if (b !== -1) {                                // two nodes side by side
        const key = a < b ? `${a},${b}` : `${b},${a}`
        if (!pairs.has(key)) { pairs.add(key); edges.push({ pts: [nodes[a].at, nodes[b].at], a, b }) }
      } else if (!seen[q]) {
        const e = trace(a, p, q)
        if (e) edges.push(e)
      }
    }
  })
  // Rings without any node
  for (let i = 0; i < w * h; i++) {
    if (!fg[i] || node[i] !== -1 || seen[i]) continue
    const pts = [xy(i)]
    seen[i] = 1
    for (let cur = i, n; (n = nb(cur).find(n => !seen[n])) !== undefined; cur = n) { seen[n] = 1; pts.push(xy(n)) }
    if (pts.length > 2) { pts.push(pts[0]); edges.push({ pts, a: -1, b: -1 }) }
  }

  // Twigs: short pieces from a crossing to a loose end
  const isEnd = id => id === -1 || nodes[id].end
  const kept = edges.filter(e => !(e.pts.length <= SPUR + 1 && isEnd(e.a) !== isEnd(e.b)))

  return chainPaths(kept.map(e => e.pts), pairAtNodes(kept, nodes.length)).map(p => smoothPath(p, smooth))
}

const STRAIGHT = -0.7     // at a crossing, pieces go on into each other only if nearly opposite (~135°+)

/**
 * Which piece ends go on into each other at the nodes (ends numbered as in chainPaths): where two
 * pieces meet always; at a crossing the straightest pairs first, bends are left apart.
 */
function pairAtNodes(edges, nodeCount) {
  const partner = new Int32Array(2 * edges.length).fill(-1)
  const at = Array.from({ length: nodeCount }, () => [])
  edges.forEach(({ pts, a, b }, i) => {
    const dir = (from, towards) => {
      const d = [towards[0] - from[0], towards[1] - from[1]], l = Math.hypot(...d) || 1
      return [d[0] / l, d[1] / l]
    }
    const k = Math.min(4, pts.length - 1)
    if (a !== -1) at[a].push({ end: 2 * i,     dir: dir(pts[0], pts[k]) })
    if (b !== -1) at[b].push({ end: 2 * i + 1, dir: dir(pts[pts.length - 1], pts[pts.length - 1 - k]) })
  })
  const link = (p, q) => { partner[p] = q; partner[q] = p }
  for (const ends of at) {
    if (ends.length === 2) { link(ends[0].end, ends[1].end); continue }
    const pairs = []
    for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) {
      const dot = ends[i].dir[0] * ends[j].dir[0] + ends[i].dir[1] * ends[j].dir[1]
      if (dot < STRAIGHT) pairs.push([dot, ends[i].end, ends[j].end])
    }
    pairs.sort((p, q) => p[0] - q[0])
    for (const [, p, q] of pairs) if (partner[p] === -1 && partner[q] === -1) link(p, q)
  }
  return partner
}

/**
 * Removes pixels that only make a staircase: pixels with ≥ 2 neighbours whose removal keeps
 * the lines connected and opens no hole (Yokoi connectivity number 1). Line ends stay.
 */
function removeStairs(fg, w, h, on) {
  let changed = true
  while (changed) {
    changed = false
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!fg[y * w + x]) continue
      const v = RING.map(([dx, dy]) => on(x + dx, y + dy) ? 1 : 0)
      if (v.reduce((s, b) => s + b, 0) < 2) continue
      let yokoi = 0
      for (let k = 0; k < 8; k += 2)
        yokoi += (1 - v[k]) - (1 - v[k]) * (1 - v[k + 1]) * (1 - v[(k + 2) % 8])
      if (yokoi === 1) { fg[y * w + x] = 0; changed = true }
    }
  }
}

/** Moving average over ±r points; open paths keep their ends, closed ones stay closed. */
function smoothPath(pts, r) {
  const n = pts.length
  if (r < 1 || n < 3) return pts
  const closed = pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1]
  const m = closed ? n - 1 : n                       // distinct points
  const out = []
  for (let i = 0; i < m; i++) {
    const rr = closed ? Math.min(r, (m - 1) >> 1) : Math.min(r, i, m - 1 - i)
    let sx = 0, sy = 0
    for (let j = -rr; j <= rr; j++) { const p = pts[(i + j + m) % m]; sx += p[0]; sy += p[1] }
    out.push([sx / (2 * rr + 1), sy / (2 * rr + 1)])
  }
  if (closed) out.push(out[0])
  return out
}
