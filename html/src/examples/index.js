/**
 * The examples on the start page. Every other .js file in this folder is one example
 * (see defineExample.js); its file name is its id, and `designer.html?example=<id>` opens it.
 * Each carries its picture, so they are loaded on demand, not with the app.
 */
const modules = import.meta.glob(['./*.js', '!./index.js', '!./defineExample.js'], { import: 'default' })

const idOf = path => path.slice(2, -3)      // './flower.js' → 'flower'

export const EXAMPLE_IDS = Object.keys(modules).map(idOf)

/** `{ id, title, text, order, project }`, or null if there is no such example or it is broken. */
export async function loadExample(id) {
  const load = modules[`./${id}.js`]
  if (!load) return null
  try {
    return { id, ...(await load()) }
  } catch (e) {
    console.error(`Example "${id}" could not be loaded:`, e)
    return null
  }
}

/** The picture of an example (templates start empty projects with one), or null. */
export async function loadExamplePicture(id) {
  const example = id ? await loadExample(id) : null
  return example?.project.steps[0]?.values?.image ?? null
}

/** All examples, in their `order`. */
export async function loadExamples() {
  const all = await Promise.all(EXAMPLE_IDS.map(loadExample))
  return all.filter(Boolean).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}
