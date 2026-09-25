import { readProjectData } from '@/project/projectFile.js'

/**
 * One example for the start page: a title, a short text and a complete project
 * (pipeline + picture), checked like an opened project file.
 *
 * To update an example: open it in the designer, change what you like, press Save and
 * paste the saved .horucnc.json as `project` into its file.
 */
export function defineExample({ title, text = '', order = 100, project }) {
  if (!title) throw new Error('An example needs a title')
  return { title, text, order, project: readProjectData(project) }
}
