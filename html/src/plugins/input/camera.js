import CameraPreview from './camera.vue'

/** @type {import('../types').FilterPlugin} */
export const cameraPlugin = {
  id:          'camera',
  label:       'Camera',
  description: 'Choose your camera and adjust size and mirroring',
  inputType:   'none',
  outputType:  'image',
  params: [
    { type: 'camera-select', key: 'deviceId', label: 'Camera', default: '' },
    { type: 'sep' },
    { type: 'preset-select', key: 'dpi', label: 'Resolution', default: 254,
      options: ({ camera, values } = {}) => {
        const nr   = camera?.nativeRes?.value
        const pw   = values?.physicalWidth ?? 100
        const side = nr ? Math.min(nr.w, nr.h) : Math.round(254 * pw / 25.4)

        return [
          { frac: 1/8, label: 'Draft'  },
          { frac: 1/4, label: 'Normal' },
          { frac: 1/2, label: 'Fine'   },
          { frac: 3/4, label: 'High'   },
          { frac: 1,   label: 'Ultra'  },
        ].map(({ frac, label }) => {
          const px   = Math.max(16, Math.round(side * frac))
          const dpi  = Math.round(px * 25.4 / pw)
          const pxmm = (px / pw).toFixed(1)
          return { value: dpi, label, desc: `${px} px · ${pxmm} px/mm` }
        })
      },
    },
    { type: 'toggle', key: 'flipH',         label: 'Flip horizontal', default: false },
    { type: 'sep' },
    { type: 'range',  key: 'physicalWidth', label: 'Field width', min: 10, max: 500, default: 100, unit: ' mm', step: 1 },
  ],
  InputComponent: CameraPreview,
}
