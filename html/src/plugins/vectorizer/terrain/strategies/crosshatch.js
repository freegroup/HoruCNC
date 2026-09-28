import { parallelLines } from '../field.js'

export default {
  id:     'crosshatch',
  label:  'Cross hatch',
  params: [
    { type: 'range', key: 'lineStep', label: 'Line step',  min: 0.1, max: 5,  step: 0.1, default: 1, unit: ' mm' },
    { type: 'range', key: 'angle',    label: 'Scan angle', min: 0,   max: 90, step: 1,   default: 0, unit: ' °' },
  ],
  // Parallel lines, then once more at right angles
  make: ({ w, h }, p, step) => {
    const angle = p.angle ?? 0
    return [...parallelLines(w, h, step, angle), ...parallelLines(w, h, step, angle + 90)]
  },
}
