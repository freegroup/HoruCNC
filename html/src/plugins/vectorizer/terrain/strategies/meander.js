import { parallelLines } from '../field.js'

export default {
  id:     'meander',
  label:  'Meander',
  params: [
    { type: 'range', key: 'lineStep', label: 'Line step',  min: 0.1, max: 5,  step: 0.1, default: 1, unit: ' mm' },
    { type: 'range', key: 'angle',    label: 'Scan angle', min: 0,   max: 90, step: 1,   default: 0, unit: ' °' },
  ],
  // Parallel lines back and forth; each line is its own path
  make: ({ w, h }, p, step) => parallelLines(w, h, step, p.angle ?? 0),
}
