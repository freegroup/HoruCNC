export const grayscaleEngravingTemplate = {
  id:          'grayscale-engraving',
  name:        'Grayscale Engraving',
  description: 'Convert image to grayscale paths — good for flat surface engraving',
  blocks: [
    { blockId: 'image',  plugins: ['camera', 'grayscale'] },
    { blockId: 'vector', plugins: ['contours'] },
    { blockId: 'grbl',   plugins: ['gcode'] },
  ],
}
