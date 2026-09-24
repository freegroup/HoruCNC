import GcodePreview from './gcode.vue'
import VectorPreview from '../vector/VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const gcodePlugin = {
  id:          'gcode',
  label:       'Machine Setup',
  description: 'Choose your cutter, how deep each pass goes and the speeds',
  inputType:   'contour',
  outputType:  'gcode',
  params: [
    { type: 'heading', label: 'Cutting tool' },
    { type: 'select',  key: 'tool', label: 'Cutter', default: 'flat', options: [
      { value: 'flat',  label: 'End mill (flat)' },
      { value: 'ball',  label: 'Ball nose' },
      { value: 'vee',   label: 'V-bit' },
      { value: 'torus', label: 'Bullnose' },
    ] },
    { type: 'number', key: 'toolDiameter', label: 'Diameter',       unit: 'mm', min: 0.5, max: 40,  step: 0.5, default: 3 },
    { type: 'number', key: 'veeAngle',     label: 'Included angle', unit: '°',  min: 10,  max: 170, step: 1,   default: 90, when: v => v.tool === 'vee' },
    { type: 'number', key: 'cornerRadius', label: 'Corner radius',  unit: 'mm', min: 0.1, max: 12,  step: 0.1, default: 1,  when: v => v.tool === 'torus' },

    { type: 'heading', label: 'Multiple Passes' },
    { type: 'number',  key: 'stepdown', label: 'Max stepdown / pass',  unit: 'mm', min: 0.05, max: 10,  step: 0.05, default: 0.6 },

    { type: 'heading', label: 'Feeds & speeds' },
    { type: 'number', key: 'safeZ',   label: 'Safe Z',    unit: 'mm',     min: 0.5, max: 30,    step: 0.5, default: 5 },
    { type: 'number', key: 'feed',    label: 'Feed',      unit: 'mm/min', min: 50,  max: 10000, step: 50,  default: 1200 },
    { type: 'number', key: 'plunge',  label: 'Plunge',    unit: 'mm/min', min: 20,  max: 5000,  step: 20,  default: 400 },
    { type: 'number', key: 'spindle', label: 'Spindle S', unit: 'rpm',    min: 0,   max: 60000, step: 500, default: 18000 },

    // Chosen in the Download step at the end of the timeline
    { type: 'hidden', key: 'format', default: 'grbl' },
  ],
  InputComponent:  VectorPreview,
  OutputComponent: GcodePreview,
  outputModes: [
    { id: '3d',  label: '3D' },
    { id: 'cam', label: 'CAM' },
  ],
}
