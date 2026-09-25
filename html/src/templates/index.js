import { lineArtTemplate }          from './line-art.js'
import { grayscaleToLinesTemplate } from './grayscale-to-lines.js'
import { heightmapTemplate }        from './heightmap.js'

/** All built-in pipeline templates; the first one is the default for an empty designer. */
export const DEFAULT_TEMPLATES = [
  lineArtTemplate,
  grayscaleToLinesTemplate,
  heightmapTemplate,
]
