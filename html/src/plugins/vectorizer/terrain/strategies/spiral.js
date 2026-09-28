export default {
  id:     'spiral',
  label:  'Spiral',
  params: [
    { type: 'range', key: 'lineStep', label: 'Ring step', min: 0.1, max: 5, step: 0.1, default: 1, unit: ' mm' },
  ],
  // Archimedean spiral around the centre, one ring every `step` px, a point about every px
  make: ({ w, h }, p, step) => {
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2
    const pts = []
    for (let a = 0, r = 0; r <= R; r = step * a / (2 * Math.PI)) {
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
      a += Math.min(0.5, 1 / Math.max(r, 1))
    }
    return [pts]
  },
}
