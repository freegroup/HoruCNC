/** @type {import('../types').FilterPlugin} */
export const grayscalePlugin = {
  id: 'grayscale',
  label: 'Grayscale',
  description: 'Turn the image into black and white with adjustable brightness',
  inputType: 'image',
  outputType: 'image',
  params: [
    { type: 'toggle', key: 'invert',     label: 'Invert',      default: false },
    { type: 'toggle', key: 'autoLevels', label: 'Auto levels', default: true  },
  ],
}
