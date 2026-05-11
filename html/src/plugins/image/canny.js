/** @type {import('../types').FilterPlugin} */
export const cannyPlugin = {
  id: 'canny',
  label: 'Canny Edge',
  description: 'Find the outlines and edges in the image',
  inputType: 'image',
  outputType: 'image',
  params: [
    { type: 'range', key: 'threshLow',  label: 'Threshold Low',  min: 0, max: 255, default: 80  },
    { type: 'range', key: 'threshHigh', label: 'Threshold High', min: 0, max: 255, default: 160 },
    { type: 'sep' },
    { type: 'range', key: 'blur', label: 'Blur', min: 1, max: 15, default: 3, unit: 'px' },
  ],
}
