/**
 * A pipeline template: the steps a new project starts with.
 *
 *   blocks   — per block the plugin ids, in order; the first of each block is its mandatory step
 *   values   — optional start values per plugin id, on top of the plugins' own defaults
 *   picture  — optional id of an example whose picture the project starts with (it replaces the
 *              current one), so every step shows a fitting result right away
 */
export function defineTemplate({ id, name, description = '', blocks, values = {}, picture = null }) {
  if (!id || !name || !Array.isArray(blocks)) throw new Error(`Template "${id}" needs an id, a name and blocks`)
  return { id, name, description, blocks, values, picture }
}
