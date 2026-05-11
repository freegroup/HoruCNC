import { contoursPlugin } from './contours.js'
import { skeletonPlugin } from './skeleton.js'
import { terrainPlugin }  from './terrain.js'

/** @type {Map<string, import('../types').FilterPlugin>} */
export const vectorizerRegistry = new Map([
  ['contours', contoursPlugin],
  ['skeleton', skeletonPlugin],
  ['terrain',  terrainPlugin],
])
