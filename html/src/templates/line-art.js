import { defineTemplate } from './defineTemplate.js'

export const lineArtTemplate = defineTemplate({
  id:          'line-art',
  name:        'Carving line art',
  description: 'A drawing with black lines — one path is milled right down the middle of every line',
  blocks: [
    { blockId: 'image',  plugins: ['source', 'blackwhite', 'skeletonize'] },
    { blockId: 'vector', plugins: ['skeleton'] },
    { blockId: 'grbl',   plugins: ['gcode'] },
  ],
  // Black lines on white paper: invert, so the lines are what Line thinning works on
  values:  { blackwhite: { invert: true } },
  picture: 'flower',
})
