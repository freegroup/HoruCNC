import { line } from '../field.js'

export default {
  id:     'radial',
  label:  'Radial',
  params: [
    { type: 'range', key: 'lineStep', label: 'Spoke step', min: 0.1, max: 5, step: 0.1, default: 1, unit: ' mm' },
  ],
  // Spokes from the centre, `step` px apart two thirds of the way out; every other one runs
  // inwards, so the way to the next spoke is short
  make: ({ w, h }, p, step) => {
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2
    const n = Math.max(8, Math.round(2 * Math.PI * R * 2 / 3 / step))
    return Array.from({ length: n }, (_, i) => {
      const a = 2 * Math.PI * i / n
      const out = [cx + R * Math.cos(a), cy + R * Math.sin(a)]
      return i % 2 ? line(out, [cx, cy]) : line([cx, cy], out)
    })
  },
}
