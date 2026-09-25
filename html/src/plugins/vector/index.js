import { simplifyPlugin }    from './simplify.js'
import { smoothPlugin }      from './smooth.js'
import { removeshortPlugin } from './removeshort.js'
import { sortpathsPlugin }   from './sortpaths.js'
import { setzPlugin }        from './setz.js'
import { scalePlugin }       from './scale.js'

/** @type {Map<string, import('../types').FilterPlugin>} */
export const vectorRegistry = new Map([
  ['simplify',    simplifyPlugin],
  ['smooth',      smoothPlugin],
  ['removeshort', removeshortPlugin],
  ['sortpaths',   sortpathsPlugin],
  ['setz',        setzPlugin],
  ['scale',       scalePlugin],
])
