import { parallelLines } from '../field.js'

export default {
  id:     'halftone',
  label:  'Halftone lines',
  params: [
    { type: 'range', key: 'lineStep', label: 'Line spacing', min: 2,   max: 20, step: 0.5, default: 3,   unit: ' mm' },
    { type: 'range', key: 'angle',    label: 'Angle',        min: 0,   max: 180, step: 1,  default: 45,  unit: ' °' },
    { type: 'range', key: 'minDepth', label: 'Min depth',    min: 0,   max: 2,  step: 0.05, default: 0.2, unit: ' mm' },
  ],
  // Parallel lines across the whole picture, never broken: the brightness only sets the depth —
  // with a V-bit the width. Each line is its own path, the cutter leaves the material in between.
  make: (field, p, step) => {
    const maxDepth = p.maxDepth ?? 2
    const minDepth = Math.min(p.minDepth ?? 0.2, maxDepth)
    const paths = []
    for (const pts of parallelLines(field.w, field.h, step, p.angle ?? 45)) {
      const path = []
      for (const [x, y] of pts) {
        const k = field.at(x, y)
        if (k < 0) continue                                   // outside the picture
        path.push([x, y, -(minDepth + (maxDepth - minDepth) * k)])
      }
      if (path.length >= 2) paths.push(path)
    }
    return { paths }
  },
}
