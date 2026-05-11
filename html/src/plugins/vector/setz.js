/** @type {import('../types').FilterPlugin} */
export const setzPlugin = {
  id:          'setz',
  label:       'Set Z',
  description: 'Override the Z depth of all contour points',
  inputType:   'contour',
  outputType:  'contour',
  params: [
    { type: 'range', key: 'z', label: 'Z depth', min: -20, max: 0, step: 0.1, default: -1.5, unit: ' mm' },
  ],
}
