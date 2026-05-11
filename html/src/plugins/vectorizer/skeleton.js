import VectorPreview from '../vector/VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const skeletonPlugin = {
  id:          'skeleton',
  label:       'Skeleton',
  description: 'Trace thin edge pixels (e.g. Canny) into single-line vector paths',
  inputType:   'image',
  outputType:  'contour',
  params: [
    { type: 'range', key: 'width',      label: 'Width',       min: 10, max: 500, default: 100, unit: ' mm' },
    { type: 'range', key: 'minContour', label: 'Min contour', min: 1,  max: 200, default: 5,   unit: ' px' },
  ],
  OutputComponent: VectorPreview,
}
