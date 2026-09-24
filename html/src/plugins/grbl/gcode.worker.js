/** Even stepdown: as few passes as the max stepdown allows, all equally deep. */
export const passCount = v => Math.max(1, Math.ceil((v.depth ?? 0) / (v.stepdown || 1) - 1e-9))

// ── Z convention for all vectors ──────────────────────────────────────────────
// A point's z IS the machine Z: 0 = stock surface, negative = into the material. The depth
// comes from the converter (Contours / Skeleton: "Depth", Terrain: black → -maxDepth) or a
// vector filter (Set Z) — Manufacture only decides how many passes it takes to get there.
const EPS = 0.01

/** Deepest point of all paths, as a positive depth in mm (0 = flat 2D paths). */
export function pathDepth(contours) {
  let d = 0
  for (const c of contours ?? []) for (const p of c) {
    const z = p[2]
    if (Number.isFinite(z) && -z > d) d = -z
  }
  return d > EPS ? d : 0
}

/**
 * Machine paths — the cutter's moves in mm, packed [rapid(1|0), x, y, z] × n.
 * Turning them into G-code text is the post-processor's job (see posts.js), chosen at the
 * end of the timeline. Origin (0,0) is the bottom-left of the paths, Z0 the stock surface.
 */
export async function process(prev, params) {
  const diameter = params.toolDiameter ?? 3
  const stepdown = params.stepdown     ?? 0.6
  const safeZ    = params.safeZ        ?? 5

  const contours = (prev?.contours ?? []).filter(c => c.length >= 2)

  // mm per pixel from camera calibration; fallback to 96 DPI if not set
  const PX_TO_MM = prev?.meta?.mmPerPixel ?? 0.264583

  let minPx = Infinity, maxPy = -Infinity
  for (const contour of contours) {
    for (const [px, py] of contour) {
      if (px < minPx) minPx = px
      if (py > maxPy) maxPy = py
    }
  }
  if (!isFinite(minPx)) { minPx = 0; maxPy = 0 }
  const X = px => (px - minPx) * PX_TO_MM
  const Y = py => (maxPy - py) * PX_TO_MM

  // Every path is cut down to its own z. The deepest point of all paths sets the number of
  // passes, so every pass stays within the max stepdown and all passes are equally deep.
  const maxDepth = pathDepth(contours)
  const passes   = passCount({ depth: maxDepth, stepdown })

  const moves = [1, 0, 0, safeZ]
  let cx = 0, cy = 0, cz = safeZ
  function move(rapid, x = cx, y = cy, z = cz) {
    if (x === cx && y === cy && z === cz) return
    moves.push(rapid ? 1 : 0, x, y, z)
    cx = x; cy = y; cz = z
  }

  for (const contour of contours) {
    const [sx, sy] = contour[0]
    const [ex, ey] = contour[contour.length - 1]
    const isClosed = Math.abs(sx - ex) < 0.5 && Math.abs(sy - ey) < 0.5

    move(true, X(sx), Y(sy))

    // Open paths run back and forth between passes, closed paths go round again —
    // either way the tool stays in the slot and only plunges to the next level.
    let path = contour
    for (let pass = 1; pass <= passes; pass++) {
      if (pass > 1 && !isClosed) path = [...path].reverse()

      const level = maxDepth * pass / passes
      const cutZ  = p => Math.max(p[2] ?? 0, -level)   // never below this pass's level
      move(false, cx, cy, cutZ(path[0]))
      for (const p of path.slice(1)) move(false, X(p[0]), Y(p[1]), cutZ(p))
    }
    move(true, cx, cy, safeZ)
  }

  const tool = { type: params.tool ?? 'flat', diameter, angle: params.veeAngle ?? 90, corner: params.cornerRadius ?? 1 }
  return { kind: 'gcode', moves: new Float32Array(moves), tool, safeZ }
}
