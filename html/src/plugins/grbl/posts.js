/**
 * Post-processors — turn machine paths (packed [rapid, x, y, z] × n) into G-code text for one
 * controller dialect. Modelled on PatternMaster's js/gcode/grbl.js and marlin.js.
 * A cut straight down (XY unchanged, Z lower) runs at plunge feed, every other cut at feed.
 */

const f3 = n => (Math.round(n * 1000) / 1000).toFixed(3)

/** Retract at the end — unless the paths already finish at safe height. */
const retract = (moves, safeZ) => moves[moves.length - 1] >= safeZ - 1e-4 ? [] : [`G0 Z${f3(safeZ)}`]

/** Deepest cut of the machine paths, in mm (positive). */
const depthOf = moves => { let z = 0; for (let i = 3; i < moves.length; i += 4) z = Math.min(z, moves[i]); return -z }

const TOOL_NAMES = { flat: 'End mill (flat)', ball: 'Ball nose', vee: 'V-bit', torus: 'Bullnose' }

function body(moves, { feed, plunge }) {
  const L = []
  for (let i = 4; i < moves.length; i += 4) {
    const x = moves[i + 1], y = moves[i + 2], z = moves[i + 3]
    const px = moves[i - 3], py = moves[i - 2], pz = moves[i - 1]
    const words = []
    if (f3(x) !== f3(px)) words.push('X' + f3(x))
    if (f3(y) !== f3(py)) words.push('Y' + f3(y))
    if (f3(z) !== f3(pz)) words.push('Z' + f3(z))
    if (!words.length) continue
    if (moves[i] === 1) { L.push('G0 ' + words.join(' ')); continue }
    const isPlunge = Math.abs(x - px) < 1e-4 && Math.abs(y - py) < 1e-4 && z < pz - 1e-4
    L.push(`G1 ${words.join(' ')} F${isPlunge ? plunge : feed}`)
  }
  return L
}

function comments(result, values) {
  const t = result.tool
  const tool = `${TOOL_NAMES[t.type] ?? t.type} Ø${t.diameter} mm`
    + (t.type === 'vee'   ? `, ${t.angle}°` : '')
    + (t.type === 'torus' ? `, corner R${t.corner} mm` : '')
  return [
    `; Tool: ${tool}`,
    `; Depth: ${depthOf(result.moves).toFixed(2)} mm (from the vectors), max ${values.stepdown} mm per pass`,
    '; Origin (X0 Y0): bottom-left. Z0 = workpiece surface, Z- = material.',
  ]
}

export const POSTS = [
  {
    id: 'grbl', name: 'GRBL', ext: 'nc',
    hint: 'Most hobby CNC routers (Shapeoko, 3018, …)',
    emit(result, v) {
      const safeZ = result.safeZ
      return [
        '; HoruCNC — GRBL export',
        ...comments(result, v),
        'G21 G90 G17 G94',
        ...(v.spindle ? [`M3 S${v.spindle}`] : []),
        `G0 Z${f3(safeZ)}`,
        ...body(result.moves, v),
        ...retract(result.moves, safeZ),
        ...(v.spindle ? ['M5'] : []),
        'M2',
      ].join('\n')
    },
  },
  {
    id: 'marlin', name: 'Marlin', ext: 'gcode',
    hint: 'Marlin-based machines and 3D printers with a spindle',
    emit(result, v) {
      const safeZ = result.safeZ
      return [
        '; HoruCNC — Marlin export',
        ...comments(result, v),
        'G21 ; mm',
        'G90 ; absolute',
        ...(v.spindle ? [`M3 S${v.spindle} ; spindle on`] : []),
        `G0 Z${f3(safeZ)} F${Math.max(v.feed, 1200)}`,
        ...body(result.moves, v),
        ...retract(result.moves, safeZ),
        ...(v.spindle ? ['M5 ; spindle off'] : []),
      ].join('\n')
    },
  },
]

export const postById = id => POSTS.find(p => p.id === id) ?? POSTS[0]
