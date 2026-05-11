/** @type {import('../types').FilterPlugin} */
export const blackWhitePlugin = {
  id: 'blackwhite',
  label: 'Black & White',
  description: 'Threshold image to pure black and white',
  inputType: 'image',
  outputType: 'image',
  params: [
    { type: 'range',  key: 'threshold', label: 'Threshold', min: 0, max: 255, step: 1, default: 128 },
    { type: 'toggle', key: 'invert',    label: 'Invert',    default: false },
  ],
}
