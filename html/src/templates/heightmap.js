import { defineTemplate } from './defineTemplate.js'

export const heightmapTemplate = defineTemplate({
  id:          'heightmap',
  name:        'Heightmap image',
  description: 'The brightness of a picture becomes depth — carved as a 3D relief',
  blocks: [
    { blockId: 'image',  plugins: ['source', 'grayscale'] },
    { blockId: 'vector', plugins: ['terrain'] },
    { blockId: 'grbl',   plugins: ['gcode'] },
  ],
  picture: 'gummy',
})
