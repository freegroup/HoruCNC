import VectorPreview from '../vector/VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const contoursPlugin = {
  id:          'contours',
  label:       'Contours',
  description: 'Trace edges as closed boundary paths (Moore Neighbor Tracing)',
  inputType:   'image',
  outputType:  'contour',
  params: [
    { type: 'range',  key: 'width',      label: 'Width',       min: 10, max: 500, default: 100, unit: ' mm' },
    { type: 'range',  key: 'minContour', label: 'Min contour', min: 1,  max: 200, default: 10,  unit: ' px' },
    { type: 'sep' },
    { type: 'toggle', key: 'invertFill', label: 'Invert fill', default: false },
  ],
  OutputComponent: VectorPreview,
}
