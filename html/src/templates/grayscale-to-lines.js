import { defineTemplate } from './defineTemplate.js'

export const grayscaleToLinesTemplate = defineTemplate({
  id:          'grayscale-to-lines',
  name:        'Grayscale to line art',
  description: 'A photo or a coloured picture — its edges are found and engraved as lines',
  blocks: [
    { blockId: 'image',  plugins: ['source', 'grayscale', 'canny'] },
    { blockId: 'vector', plugins: ['contours'] },
    { blockId: 'grbl',   plugins: ['gcode'] },
  ],
  picture: 'mokka',
})
