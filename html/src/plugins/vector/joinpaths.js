import VectorPreview from './VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const joinpathsPlugin = {
  id:          'joinpaths',
  label:       'Join paths',
  description: 'Connect paths whose ends almost touch into one path',
  inputType:   'contour',
  outputType:  'contour',
  params: [
    { type: 'number', key: 'maxGap', label: 'Max gap', unit: 'mm', min: 0, max: 10, step: 0.1, default: 0.5 },
  ],
  OutputComponent: VectorPreview,
}
