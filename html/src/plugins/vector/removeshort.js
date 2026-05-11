import VectorPreview from './VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const removeshortPlugin = {
  id:          'removeshort',
  label:       'Remove Short',
  description: 'Remove very short cutting paths that would leave unwanted marks',
  inputType:   'contour',
  outputType:  'contour',
  params: [
    { type: 'range', key: 'minPoints', label: 'Min points', min: 2, max: 200, default: 20 },
  ],
  InputComponent:  VectorPreview,
  OutputComponent: VectorPreview,
}
