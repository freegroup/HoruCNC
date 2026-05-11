import { process as processCamera }      from '../plugins/input/camera.worker.js'
import { process as processGrayscale }   from '../plugins/image/grayscale.worker.js'
import { process as processBlackWhite }  from '../plugins/image/blackwhite.worker.js'
import { process as processCanny }       from '../plugins/image/canny.worker.js'
import { process as processCrop }        from '../plugins/image/crop.worker.js'
import { process as processSkeletonize } from '../plugins/image/skeletonize.worker.js'
import { process as processContours }    from '../plugins/vectorizer/contours.worker.js'
import { process as processSkeleton }    from '../plugins/vectorizer/skeleton.worker.js'
import { process as processTerrain }     from '../plugins/vectorizer/terrain.worker.js'
import { process as processSimplify }    from '../plugins/vector/simplify.worker.js'
import { process as processSmooth }      from '../plugins/vector/smooth.worker.js'
import { process as processRemoveShort } from '../plugins/vector/removeshort.worker.js'
import { process as processSortPaths }   from '../plugins/vector/sortpaths.worker.js'
import { process as processSetZ }        from '../plugins/vector/setz.worker.js'
import { process as processGcode }       from '../plugins/grbl/gcode.worker.js'

const PROCESSORS = {
  camera:      processCamera,
  grayscale:   processGrayscale,
  blackwhite:  processBlackWhite,
  canny:       processCanny,
  crop:        processCrop,
  skeletonize: processSkeletonize,
  contours:    processContours,
  skeleton:    processSkeleton,
  terrain:     processTerrain,
  simplify:    processSimplify,
  smooth:      processSmooth,
  removeshort: processRemoveShort,
  sortpaths:   processSortPaths,
  setz:        processSetZ,
  gcode:       processGcode,
}

export class Pipeline {
  /** @param {{ instanceId: string, pluginId: string }[]} steps */
  constructor(steps) {
    this.steps = steps
  }

  /**
   * @param {ImageBitmap} bitmap
   * @param {Record<string, object>} paramMap  Keyed by instanceId
   * @returns {Promise<object[]>}
   */
  async run(bitmap, paramMap) {
    const initialBitmap = bitmap
    const results = []
    let current = { kind: 'image', bitmap }

    try {
      for (const step of this.steps) {
        const processor = PROCESSORS[step.pluginId]
        if (!processor) continue

        const params = paramMap[step.instanceId] ?? {}
        const result = await processor(current, params)
        // Forward meta from previous step; result can override individual keys
        if (current.meta) result.meta = { ...current.meta, ...(result.meta ?? {}) }
        result.instanceId = step.instanceId
        result.pluginId   = step.pluginId
        results.push(result)
        current = result
      }
    } catch (err) {
      for (const r of results) r?.bitmap?.close()
      initialBitmap.close()
      throw err
    }

    initialBitmap.close()
    return results
  }
}
