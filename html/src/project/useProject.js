import { usePipelineStore } from '@/stores/pipeline.js'
import { sharedCam }        from '@/plugins/grbl/preview/viewCam.js'
import { loadExamplePicture } from '@/examples/index.js'
import { pickFile, downloadFile } from '@/utils/files.js'
import { createProjectFile, parseProjectFile, FILE_EXT } from './projectFile.js'

/**
 * Save and open projects — the pipeline with its picture (a value of the source step) as one file.
 * `applyProject` is the one way a project gets into the designer — also for examples;
 * `startTemplate` starts a new one from a template.
 */
export function useProject() {
  const pipeline = usePipelineStore()

  function saveProject() {
    const file = createProjectFile({ steps: pipeline.steps, ui: pipeline.ui })
    const name = `${pipeline.ui.fileName || 'horucnc'}${FILE_EXT}`
    downloadFile(name, JSON.stringify(file, null, 2), 'application/json')
  }

  /** Replaces the current project with a chosen file. Resolves with an error message, or null. */
  async function openProject() {
    const file = await pickFile(`${FILE_EXT},.json,application/json`)
    if (!file) return null
    try {
      applyProject(parseProjectFile(await file.text()))
      return null
    } catch (e) {
      return e.message
    }
  }

  function applyProject(project) {
    pipeline.loadProject(project)
    sharedCam.framedFor = ''              // new pipeline → fit the 3D views anew
  }

  /** A new project from a template; its start picture is only fetched for an empty project. */
  async function startTemplate(template) {
    const picture = pipeline.sourceImage ? null : await loadExamplePicture(template.picture)
    pipeline.loadTemplate(template, picture)
    sharedCam.framedFor = ''
  }

  return { saveProject, openProject, applyProject, startTemplate }
}
