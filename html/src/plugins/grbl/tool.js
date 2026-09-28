/**
 * The cutter's cutting diameter from the machine setup values. A V-bit is set by its angle and
 * the height of its cone (how deep it cuts V-shaped); its diameter follows from the two.
 */
export function cutterDiameter({ tool, toolDiameter = 3, veeAngle = 90, veeHeight = 3 }) {
  if (tool !== 'vee') return toolDiameter
  return 2 * veeHeight * Math.tan((veeAngle / 2) * Math.PI / 180)
}
