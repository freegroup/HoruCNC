import VectorPreview from './VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const smoothPlugin = {
  id:          'smooth',
  label:       'Smooth',
  description: 'Smooth out jagged edges and sharp corners in the cutting paths',
  inputType:   'contour',
  outputType:  'contour',
  params: [
    { type: 'range', key: 'window', label: 'Radius', min: 1, max: 10, default: 3, unit: ' px' },
    { type: 'range', key: 'passes', label: 'Passes', min: 1, max: 5,  default: 1 },
  ],
  InputComponent:  VectorPreview,
  OutputComponent: VectorPreview,
}
