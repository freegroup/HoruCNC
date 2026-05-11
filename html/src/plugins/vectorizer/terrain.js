import VectorPreview from '../vector/VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const terrainPlugin = {
  id:          'terrain',
  label:       'Terrain',
  description: 'Convert grayscale brightness to 3D depth — creates heightmap toolpaths',
  inputType:   'image',
  outputType:  'contour',
  params: [
    { type: 'range', key: 'maxDepth',  label: 'Max depth',  min: 0.1, max: 10,  step: 0.1, default: 2.0, unit: ' mm' },
    { type: 'range', key: 'lineStep',  label: 'Line step',  min: 0.1, max: 5,   step: 0.1, default: 1.0, unit: ' mm' },
    { type: 'range', key: 'threshold', label: 'Threshold',  min: 10,  max: 255, step: 1,   default: 240, unit: ''    },
    { type: 'range', key: 'angle',     label: 'Scan angle', min: 0,   max: 90,  step: 1,   default: 0,   unit: ' °'  },
  ],
  OutputComponent: VectorPreview,
}
