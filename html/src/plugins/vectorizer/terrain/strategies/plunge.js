export default {
  id:     'plunge',
  label:  'Plunge',
  params: [
    { type: 'range', key: 'lineStep', label: 'Dot spacing', min: 0.1, max: 5, step: 0.1, default: 2, unit: ' mm' },
  ],
  // Dots on a honeycomb grid, row by row back and forth; each dot is one plunge to its depth
  make: (field, p, step) => {
    const maxDepth = p.maxDepth ?? 2
    const paths = []
    const dy = step * Math.sqrt(3) / 2
    for (let y = 0, row = 0; y < field.h; y += dy, row++) {
      const xs = []
      for (let x = row % 2 ? step / 2 : 0; x < field.w; x += step) xs.push(x)
      if (row % 2) xs.reverse()
      for (const x of xs) {
        const k = field.at(x, y)
        if (k > 0) paths.push([[x, y, 0], [x, y, -maxDepth * k]])   // straight down from the surface
      }
    }
    return { paths }
  },
}
