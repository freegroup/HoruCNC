import { defineTemplate } from './defineTemplate.js'

export const lineArtTemplate = defineTemplate({
  id:          'line-art',
  name:        'Carving line art',
  description: 'A drawing with black lines — one path is milled right down the middle of every line',
  blocks: [
    { blockId: 'image',  plugins: ['source', 'blackwhite'] },
    { blockId: 'vector', plugins: ['skeleton', 'joinpaths', 'smooth'] },
    { blockId: 'grbl',   plugins: ['gcode'] },
  ],
  values: {
    blackwhite: { threshold: 124 },
    skeleton:   { minContour: 28, smooth: 7 },
    joinpaths:  { maxGap: 1.3 },
    smooth:     { window: 2 },
    gcode:      { tool: 'vee', veeAngle: 30, veeHeight: 5.6, stepdown: 0.95 },
  },
  picture: 'mandala',
})
