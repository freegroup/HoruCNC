import { Pipeline } from './Pipeline.js'

let pipeline = new Pipeline([
  { instanceId: 'camera_1',    pluginId: 'camera'    },
  { instanceId: 'grayscale_1', pluginId: 'grayscale' },
  { instanceId: 'canny_1',     pluginId: 'canny'     },
  { instanceId: 'contours_1',  pluginId: 'contours'  },
  { instanceId: 'gcode_1',     pluginId: 'gcode'     },
])

self.onmessage = async (event) => {
  const msg = event.data

  if (msg.type === 'config') {
    // msg.steps = [{ instanceId, pluginId }, ...]
    pipeline = new Pipeline(msg.steps)
    return
  }

  if (msg.type === 'frame') {
    try {
      const results = await pipeline.run(msg.bitmap, msg.pipelineParams)

      const transferables = results
        .filter(r => r.kind === 'image')
        .map(r => r.bitmap)

      self.postMessage({ type: 'result', steps: results }, transferables)
    } catch (err) {
      self.postMessage({ type: 'error', message: err?.message ?? String(err) })
    }
  }
}
