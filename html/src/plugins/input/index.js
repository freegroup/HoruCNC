import { sourcePlugin } from './source.js'

/** @type {Map<string, import('../types').FilterPlugin>} */
export const inputRegistry = new Map([
  ['source', sourcePlugin],
])
