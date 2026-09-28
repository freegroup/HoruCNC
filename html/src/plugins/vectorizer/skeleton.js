import VectorPreview from '../vector/VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const skeletonPlugin = {
  id:          'skeleton',
  label:       'Centerline',
  description: 'Trace thin lines into single-line paths down the middle (run Line thinning first for thick lines)',
  inputType:   'image',
  outputType:  'contour',
  params: [
    { type: 'range', key: 'minContour', label: 'Min contour', min: 1, max: 200, default: 1, unit: ' px' },
    { type: 'range', key: 'depth',      label: 'Depth',       min: 0.1, max: 20, step: 0.1, default: 1.5, unit: ' mm' },
    { type: 'range', key: 'smooth',     label: 'Smoothing',   min: 0, max: 10, step: 1, default: 3, unit: ' px' },
  ],
  OutputComponent: VectorPreview,
}
