/**
 * The HoruCNC project file: the pipeline (steps + view state). The picture it works on is part
 * of it — the `image` value of the source step, a base64 data URL. Examples on the start page
 * use the same format: a project saved in the designer can become an example as it is.
 *
 * Format only: no DOM, no stores. `version` lets later releases read older files.
 */
export const FILE_EXT = '.horucnc.json'

const APP     = 'HoruCNC'
const VERSION = 1
const NOT_A_PROJECT = 'This file is not a HoruCNC project.'

/** The file document for a pipeline. */
export function createProjectFile({ steps, ui }) {
  return {
    app:     APP,
    version: VERSION,
    steps,
    ui:      { ...ui, scrollTop: 0 },    // the scroll position belongs to one browser, not the project
  }
}

/** Reads a file's text back into `{ steps, ui }` — see readProjectData. */
export function parseProjectFile(text) {
  let data
  try { data = JSON.parse(text) } catch { throw new Error(NOT_A_PROJECT) }
  return readProjectData(data)
}

/**
 * Checks a parsed project document and returns `{ steps, ui }`.
 * Throws an Error with a message fit to show the user if it is no (readable) project.
 */
export function readProjectData(data) {
  if (data?.app !== APP || !Array.isArray(data.steps) || !data.steps[0]?.instanceId)
    throw new Error(NOT_A_PROJECT)
  if (!(data.version <= VERSION))
    throw new Error('This project was saved by a newer HoruCNC — please reload the page.')
  return { steps: data.steps, ui: data.ui }
}
