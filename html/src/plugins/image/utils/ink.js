/**
 * The one rule for what gets milled: dark is ink, ink is milled — like black ink on white paper.
 * Darker is deeper. Every step that tells lines/shapes from the background reads its picture
 * with `inkMask`, the relief with `inkDepth`; every step that draws lines writes them with
 * `writeInk` (black on white).
 */
const LIMIT = 128

/**
 * How deep a grey value goes, 0…1: black 1 (deepest), `paper` and lighter 0 (not milled).
 */
export function inkDepth(value, paper = 255) {
  return value >= paper ? 0 : 1 - value / paper
}

/** 1 where a pixel is ink (dark), 0 where it is paper — from RGBA data (red channel, grey input). */
export function inkMask(data) {
  const mask = new Uint8Array(data.length / 4)
  for (let i = 0, p = 0; p < data.length; i++, p += 4) mask[i] = data[p] < LIMIT ? 1 : 0
  return mask
}

/** Writes a mask back into RGBA data: ink black, paper white. */
export function writeInk(data, mask) {
  for (let i = 0, p = 0; p < data.length; i++, p += 4) {
    const v = mask[i] ? 0 : 255
    data[p] = data[p + 1] = data[p + 2] = v
    data[p + 3] = 255
  }
}
