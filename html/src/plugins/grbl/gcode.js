import GcodePreview from './gcode.vue'
import VectorPreview from '../vector/VectorPreview.vue'

/** @type {import('../types').FilterPlugin} */
export const gcodePlugin = {
  id:          'gcode',
  label:       'Generate GCODE',
  description: 'Generate the CNC machine instructions from the cutting paths',
  inputType:   'contour',
  outputType:  'gcode',
  params: [
    { type: 'range',   key: 'toolDiameter', label: 'Tool diameter', min: 0.5, max: 12,    step: 0.5,   default: 3,     unit: ' mm' },
    { type: 'range',   key: 'flutes',       label: 'Flutes',        min: 1,   max: 4,     step: 1,     default: 2 },
    { type: 'range',   key: 'rpm',          label: 'Spindle RPM',   min: 5000,max: 30000, step: 500,   default: 18000, unit: ' rpm' },
    { type: 'range',   key: 'chipload',     label: 'Chipload',      min: 0.01,max: 0.15,  step: 0.005, default: 0.03,  unit: ' mm/tooth' },
    { type: 'display', label: 'Feed rate',  compute: v => `${Math.round(v.rpm * v.flutes * v.chipload)} mm/min` },
    { type: 'sep' },
    { type: 'range',   key: 'passes',     label: 'Passes',       min: 1,   max: 10,  step: 1,   default: 1 },
    { type: 'range',   key: 'depth',      label: 'Depth / pass', min: 0.1, max: 10,  step: 0.1, default: 1.5, unit: ' mm' },
    { type: 'display', label: 'Total depth', compute: v => `${(v.passes * v.depth).toFixed(1)} mm` },
    { type: 'range',  key: 'clearanceZ', label: 'Clearance Z', min: 1, max: 20,  default: 5,  unit: ' mm' },
    { type: 'sep' },
    { type: 'toggle', key: 'coolant', label: 'Coolant M07', default: false },
  ],
  InputComponent:  VectorPreview,
  OutputComponent: GcodePreview,
}
