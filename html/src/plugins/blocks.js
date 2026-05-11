/**
 * Block definitions — the 3 pipeline stages in strict order.
 *
 * mandatoryFirst: the first step of the block is locked (can't be deleted,
 *   only swapped for another plugin from the whitelist).
 *   whitelist: plugin IDs that are valid as the mandatory first step.
 */
export const BLOCKS = [
  {
    id:    'image',
    label: 'IMAGE',
    fixed: false,
    mandatoryFirst: { whitelist: ['camera'] },
  },
  {
    id:    'vector',
    label: 'VECTOR',
    fixed: false,
    mandatoryFirst: { whitelist: ['contours', 'skeleton', 'terrain'] },
  },
  {
    id:    'grbl',
    label: 'GRBL',
    fixed: true,
    mandatoryFirst: { whitelist: ['gcode'] },
  },
]

export const BLOCK_MAP = Object.fromEntries(BLOCKS.map(b => [b.id, b]))
