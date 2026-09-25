import VectorPreview from './VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const scalePlugin = {
  id:          'scale',
  label:       'Scale',
  description: 'Set the size of the piece in mm — width and height (in proportion or not) and the depth',
  inputType:   'contour',
  outputType:  'contour',
  params: [
    // w, h, d (depth) in mm — null = as it comes in; locked = width and height in proportion
    { type: 'size', key: 'size', label: 'Size', default: { w: null, h: null, d: null, locked: true } },
  ],
  InputComponent:  VectorPreview,
  OutputComponent: VectorPreview,
}
