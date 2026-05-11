import VectorPreview from './VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const sortpathsPlugin = {
  id:          'sortpaths',
  label:       'Sort Paths',
  description: 'Reorder cutting paths to minimise travel distance between cuts',
  inputType:   'contour',
  outputType:  'contour',
  params: [],
  InputComponent:  VectorPreview,
  OutputComponent: VectorPreview,
}
