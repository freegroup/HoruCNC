/**
 * Theme colours for code that cannot use LESS (canvas, WebGL, favicon). The values come from
 * the CSS variables global.less sets on :root — the tint colour itself lives only in theme.less.
 */
export function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
}

/** '#ff8000' → [1, 0.5, 0] for WebGL */
export function rgbFloat(color) {
  const hex = color.replace('#', '')
  const n   = parseInt(hex.length === 3 ? hex.replace(/./g, c => c + c) : hex, 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}
