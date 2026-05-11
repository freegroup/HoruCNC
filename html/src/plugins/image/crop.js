import CropOverlay from './crop.vue'

/** @type {import('../types').FilterPlugin} */
export const cropPlugin = {
  id:          'crop',
  label:       'Crop',
  description: 'Trim pixels from each edge of the image',
  inputType:   'image',
  outputType:  'image',
  params: [
    { type: 'range', key: 'leftCut',   label: 'Left',   min: 0, max: 99, default: 0, unit: ' %' },
    { type: 'range', key: 'rightCut',  label: 'Right',  min: 0, max: 99, default: 0, unit: ' %' },
    { type: 'range', key: 'topCut',    label: 'Top',    min: 0, max: 99, default: 0, unit: ' %' },
    { type: 'range', key: 'bottomCut', label: 'Bottom', min: 0, max: 99, default: 0, unit: ' %' },
  ],
  OverlayComponent: CropOverlay,
}
