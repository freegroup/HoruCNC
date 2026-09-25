import { pathDepth } from './utils/measure.js'

const depthField = (key, label, extra) =>
  ({ type: 'number', key, label, unit: 'mm', min: 0, max: 50, step: 0.1, ...extra })

/** @type {import('../types').FilterPlugin} */
export const setzPlugin = {
  id:          'setz',
  label:       'Z depth',
  description: 'Set, limit or scale how deep the paths go',
  inputType:   'contour',
  outputType:  'contour',
  params: [
    { type: 'display', label: 'Deepest point now', compute: (v, ctx) => `${pathDepth(ctx.input?.contours).toFixed(1)} mm` },
    { type: 'select', key: 'mode', label: 'Mode', default: 'set', options: [
      { value: 'set',   label: 'Set' },     // all paths at one depth
      { value: 'clamp', label: 'Clamp' },   // depths kept between a min and a max
      { value: 'scale', label: 'Scale' },   // every z scaled, the deepest point to a depth
    ] },
    depthField('depth',    'Depth',         { default: 1.5, when: v => v.mode === 'set' }),
    depthField('minDepth', 'Min depth',     { default: 0,   when: v => v.mode === 'clamp' }),
    depthField('maxDepth', 'Max depth',     { default: 3,   when: v => v.mode === 'clamp' }),
    depthField('depth',    'Deepest point', {               when: v => v.mode === 'scale' }),
  ],
}
