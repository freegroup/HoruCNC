import VectorPreview from '../vector/VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const skeletonPlugin = {
  id:          'skeleton',
  label:       'Skeleton',
  description: 'Trace thin edge pixels (e.g. Canny) into single-line vector paths',
  inputType:   'image',
  outputType:  'contour',
  params: [
    { type: 'range', key: 'minContour', label: 'Min contour', min: 1, max: 200, default: 5, unit: ' px' },
    { type: 'range', key: 'depth',      label: 'Depth',       min: 0.1, max: 20, step: 0.1, default: 1.5, unit: ' mm' },
  ],
  OutputComponent: VectorPreview,
}
