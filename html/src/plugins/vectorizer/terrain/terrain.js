import VectorPreview from '../../vector/VectorPreview.vue'
import { STRATEGIES, ownKey } from './strategies/index.js'

/**
 * Terrain: the picture's brightness becomes depth (darker is deeper). The strategy decides
 * the way the cutter takes over it; each strategy brings its own settings, shown while it is
 * chosen and stored under its name (`meander.lineStep`), so switching back finds them again.
 */
/** @type {import('../../types').FilterPlugin} */
export const terrainPlugin = {
  id:          'terrain',
  label:       'Terrain',
  description: 'Convert grayscale brightness to 3D depth — creates heightmap toolpaths',
  inputType:   'image',
  outputType:  'contour',
  params: [
    { type: 'select', key: 'strategy', label: 'Strategy', default: STRATEGIES[0].id,
      options: STRATEGIES.map(s => ({ value: s.id, label: s.label })) },
    { type: 'range', key: 'maxDepth', label: 'Max depth', min: 0.1, max: 10, step: 0.1, default: 2.0, unit: ' mm' },
    ...STRATEGIES.flatMap(s => s.params.map(p => ({
      ...p,
      key:  ownKey(s, p.key),
      when: v => (v.strategy ?? STRATEGIES[0].id) === s.id,
    }))),
    { type: 'range', key: 'threshold', label: 'Threshold', min: 10, max: 255, step: 1, default: 240, unit: '' },
  ],
  OutputComponent: VectorPreview,
}
