export { imageRegistry }       from './image/index.js'
export { vectorizerRegistry }  from './vectorizer/index.js'
export { vectorRegistry }      from './vector/index.js'
export { grblRegistry }        from './grbl/index.js'
export { BLOCKS, BLOCK_MAP }   from './blocks.js'

import { cameraPlugin }         from './input/camera.js'
import { imageRegistry }       from './image/index.js'
import { vectorizerRegistry }  from './vectorizer/index.js'
import { vectorRegistry }      from './vector/index.js'
import { grblRegistry }        from './grbl/index.js'

/** Unified lookup across all plugins. */
export const allPlugins = new Map([
  ['camera', cameraPlugin],
  ...imageRegistry,
  ...vectorizerRegistry,
  ...vectorRegistry,
  ...grblRegistry,
])

/** Backward-compat alias. */
export const pluginRegistry = allPlugins

/**
 * Map block id → addable (non-mandatory) plugin registry shown in the + picker.
 * Mandatory-first plugins are in blocks[i].mandatoryFirst.whitelist and looked
 * up via allPlugins — they are intentionally excluded here.
 */
export const BLOCK_REGISTRIES = {
  image:  imageRegistry,
  vector: vectorRegistry,
  grbl:   grblRegistry,
}
