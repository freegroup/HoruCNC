import { edgeEngravingTemplate }       from './edge-engraving.js'
import { grayscaleEngravingTemplate }  from './grayscale-engraving.js'
import { reliefTemplate }              from './relief.js'

/** All built-in pipeline templates. */
export const DEFAULT_TEMPLATES = [
  edgeEngravingTemplate,
  grayscaleEngravingTemplate,
  reliefTemplate,
]

export { edgeEngravingTemplate, grayscaleEngravingTemplate, reliefTemplate }
