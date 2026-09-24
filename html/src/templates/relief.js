export const reliefTemplate = {
  id:          'relief',
  name:        'Relief',
  description: 'Turn the brightness of a picture into depth — carves a 3D relief',
  blocks: [
    { blockId: 'image',  plugins: ['camera', 'grayscale'] },
    { blockId: 'vector', plugins: ['terrain'] },
    { blockId: 'grbl',   plugins: ['gcode'] },
  ],
}
