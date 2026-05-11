import VectorPreview from './VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const simplifyPlugin = {
  id:          'simplify',
  label:       'Simplify',
  description: 'Reduce the number of path points while keeping the shape accurate',
  inputType:   'contour',
  outputType:  'contour',
  params: [
    { type: 'range', key: 'epsilon', label: 'Tolerance', min: 0.5, max: 20, step: 0.5, default: 2, unit: ' px' },
  ],
  InputComponent:  VectorPreview,
  OutputComponent: VectorPreview,
}
