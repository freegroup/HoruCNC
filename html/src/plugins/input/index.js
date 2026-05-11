import { cameraPlugin } from './camera.js'

/** @type {Map<string, import('../types').FilterPlugin>} */
export const inputRegistry = new Map([
  ['camera', cameraPlugin],
])
