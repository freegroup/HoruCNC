/**
 * The HoruCNC mark: a spindle over the workpiece, a star as the cutting path
 * (after design/pipelines/pipeline_engrave_outline.png). One shape for Logo.vue and the favicon.
 */
import { cssColor } from './colors.js'

export const LOGO = {
  viewBox: '0 0 32 32',
  machine: [                       // drawn in the line colour
    'M12.5 2h7a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 19.5 8h-7A1.5 1.5 0 0 1 11 6.5v-3A1.5 1.5 0 0 1 12.5 2z',
    'M13.5 8v2.5h5V8M14.8 10.5v2.3L16 14.5l1.2-1.7v-2.3',
    'M7 17h18l3.5 12h-25z',
  ],
  star: 'M16 19.2l.94 2.51 2.67.12-2.09 1.66.71 2.58L16 24.6l-2.23 1.47.71-2.58-2.09-1.66 2.67-.12z',
}

/** Favicon from the same shape — grey lines (readable on light and dark tabs), tinted star. */
export function setFavicon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO.viewBox}" fill="none" stroke-linejoin="round" stroke-linecap="round">`
    + `<g stroke="${cssColor('muted')}" stroke-width="1.6">${LOGO.machine.map(d => `<path d="${d}"/>`).join('')}</g>`
    + `<path d="${LOGO.star}" stroke="${cssColor('accent')}" stroke-width="1.4"/></svg>`
  let link = document.querySelector('link[rel="icon"]')
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.append(link) }
  link.type = 'image/svg+xml'
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg)
}
