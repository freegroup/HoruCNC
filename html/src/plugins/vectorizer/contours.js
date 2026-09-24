import VectorPreview from '../vector/VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const contoursPlugin = {
  id:          'contours',
  label:       'Contours',
  description: 'Trace edges as closed boundary paths (Moore Neighbor Tracing)',
  inputType:   'image',
  outputType:  'contour',
  params: [
    { type: 'range',  key: 'minContour', label: 'Min contour', min: 1, max: 200, default: 10, unit: ' px' },
    { type: 'range',  key: 'depth',      label: 'Depth',       min: 0.1, max: 20, step: 0.1, default: 1.5, unit: ' mm' },
    { type: 'sep' },
    { type: 'toggle', key: 'invertFill', label: 'Invert fill', default: false },
  ],
  OutputComponent: VectorPreview,
}
