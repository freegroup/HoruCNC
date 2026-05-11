import { gcodePlugin } from './gcode.js'

/** @type {Map<string, import('../types').FilterPlugin>} */
export const grblRegistry = new Map([
  ['gcode', gcodePlugin],
])
