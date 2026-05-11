export const edgeEngravingTemplate = {
  id:          'edge-engraving',
  name:        'Edge Engraving',
  description: 'Detect edges from a camera image and engrave them as cutting paths',
  blocks: [
    { blockId: 'image',  plugins: ['camera', 'grayscale', 'canny'] },
    { blockId: 'vector', plugins: ['contours'] },
    { blockId: 'grbl',   plugins: ['gcode'] },
  ],
}
