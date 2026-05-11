export async function process(prev, params) {
  const rpm          = params.rpm          ?? 18000
  const flutes       = params.flutes       ?? 2
  const chipload     = params.chipload     ?? 0.03
  const feedrate     = Math.round(rpm * flutes * chipload)
  const plungeRate   = Math.round(feedrate * 0.25)
  const depthPerPass = params.depth  ?? 1.5
  const passes       = Math.max(1, Math.round(params.passes ?? 1))
  const clearanceZ   = params.clearanceZ ?? 5
  const coolant      = params.coolant    ?? false

  const contours = prev?.contours ?? []
  const lines    = []

  lines.push('; HoruCNC — generated toolpath')
  lines.push(`; Passes: ${passes}  Depth/pass: ${depthPerPass.toFixed(2)} mm  Total: ${(passes * depthPerPass).toFixed(2)} mm`)
  lines.push('G21 ; metric')
  lines.push('G90 ; absolute')
  lines.push(`G00 Z${clearanceZ.toFixed(4)}`)
  lines.push(`M03 S${rpm}`)
  if (coolant) lines.push('M07')
  lines.push('')

  // mm per pixel from camera calibration; fallback to 96 DPI if not set
  const PX_TO_MM = prev.meta?.mmPerPixel ?? 0.264583

  // Compute bounding box to place origin at (0,0) — bottom-left of work area
  let minPx = Infinity, maxPy = -Infinity
  for (const contour of contours) {
    for (const [px, py] of contour) {
      if (px < minPx) minPx = px
      if (py > maxPy) maxPy = py
    }
  }
  if (!isFinite(minPx)) { minPx = 0; maxPy = imgH }

  for (const contour of contours) {
    if (contour.length < 2) continue

    const [sx, sy, sz] = contour[0]
    const cncSX = ((sx - minPx) * PX_TO_MM).toFixed(4)
    const cncSY = ((maxPy - sy) * PX_TO_MM).toFixed(4)

    // 3D mode: any contour point has non-zero Z → use per-point Z, single pass
    const has3D = contour.some(p => (p[2] ?? 0) !== 0)

    lines.push(`G00 X${cncSX} Y${cncSY}`)

    if (has3D) {
      // Single-pass 3D toolpath — Z comes from each contour point directly
      lines.push(`G01 Z${(sz ?? 0).toFixed(4)} F${plungeRate}`)
      for (const [x, y, z] of contour) {
        lines.push(`G01 X${((x - minPx) * PX_TO_MM).toFixed(4)} Y${((maxPy - y) * PX_TO_MM).toFixed(4)} Z${(z ?? 0).toFixed(4)} F${feedrate}`)
      }
      lines.push(`G00 Z${clearanceZ.toFixed(4)}`)

    } else {
      // Flat multi-pass — Z from depth parameter, passes from passes parameter
      const [ex, ey] = contour[contour.length - 1]
      const isClosed = Math.abs(sx - ex) < 0.5 && Math.abs(sy - ey) < 0.5

      for (let pass = 1; pass <= passes; pass++) {
        const zDepth = -(pass * depthPerPass)
        if (passes > 1) lines.push(`; Pass ${pass}/${passes}`)

        if (pass > 1 && !isClosed) lines.push(`G00 X${cncSX} Y${cncSY}`)
        lines.push(`G01 Z${zDepth.toFixed(4)} F${plungeRate}`)

        for (const [x, y] of contour) {
          lines.push(`G01 X${((x - minPx) * PX_TO_MM).toFixed(4)} Y${((maxPy - y) * PX_TO_MM).toFixed(4)} F${feedrate}`)
        }

        if (pass < passes && !isClosed) lines.push(`G00 Z${clearanceZ.toFixed(4)}`)
      }
      lines.push(`G00 Z${clearanceZ.toFixed(4)}`)
    }

    lines.push('')
  }

  if (coolant) lines.push('M09')
  lines.push('M05')
  lines.push('M30')

  return { kind: 'gcode', text: lines.join('\n') }
}
