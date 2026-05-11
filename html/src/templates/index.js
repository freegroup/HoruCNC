import { edgeEngravingTemplate }       from './edge-engraving.js'
import { grayscaleEngravingTemplate }  from './grayscale-engraving.js'

/** All built-in pipeline templates. */
export const DEFAULT_TEMPLATES = [
  edgeEngravingTemplate,
  grayscaleEngravingTemplate,
]

export { edgeEngravingTemplate, grayscaleEngravingTemplate }
