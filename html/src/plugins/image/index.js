import { grayscalePlugin }   from './grayscale.js'
import { cannyPlugin }       from './canny.js'
import { blackWhitePlugin }  from './blackwhite.js'
import { cropPlugin }        from './crop.js'
import { skeletonizePlugin } from './skeletonize.js'

/** @type {Map<string, import('../types').FilterPlugin>} */
export const imageRegistry = new Map([
  ['grayscale',   grayscalePlugin],
  ['canny',       cannyPlugin],
  ['blackwhite',  blackWhitePlugin],
  ['crop',        cropPlugin],
  ['skeletonize', skeletonizePlugin],
])
