import { ref, shallowRef, onUnmounted } from 'vue'

/**
 * Manages the pipeline WebWorker.
 * stepResults is an array indexed by step position (matching store.steps order).
 */
export function usePipelineWorker() {
  /** @type {import('vue').ShallowRef<object[]>} */
  const stepResults  = shallowRef([])
  const isProcessing = ref(false)

  const worker = new Worker(
    new URL('../worker/pipeline.worker.js', import.meta.url),
    { type: 'module' }
  )

  let _totalReceived = 0
  let _totalClosed   = 0
  let _frameCount    = 0

  worker.onmessage = (event) => {
    const msg = event.data
    if (msg.type === 'result') {
      const old = stepResults.value
      const incoming = msg.steps.filter(s => s?.bitmap).length
      _totalReceived += incoming

      stepResults.value  = msg.steps
      isProcessing.value = false

      setTimeout(() => {
        let closed = 0
        for (const step of old) {
          if (step?.bitmap) { step.bitmap.close(); closed++ }
        }
        _totalClosed += closed
        _frameCount++

        if (_frameCount % 30 === 0) {
          const live = _totalReceived - _totalClosed
          const mem  = performance?.memory
          const heap = mem ? ` | heap ${(mem.usedJSHeapSize / 1e6).toFixed(1)} / ${(mem.jsHeapSizeLimit / 1e6).toFixed(0)} MB` : ''
          console.log(`[Bitmap] frame=${_frameCount}  received=${_totalReceived}  closed=${_totalClosed}  live=${live}${heap}`)
          if (live > 20) console.warn(`[Bitmap] ⚠ live count ${live} looks high — possible leak`)
        }
      }, 0)
    } else if (msg.type === 'error') {
      console.error('[Pipeline Worker]', msg.message)
      isProcessing.value = false
    }
  }

  worker.onerror = (e) => {
    console.error('[Pipeline Worker]', e)
    isProcessing.value = false
  }

  /**
   * Send a camera frame for processing.
   * @param {ImageBitmap} bitmap  Transferred — do not use after calling this
   * @param {Record<string, object>} pipelineParams  Keyed by instanceId
   */
  function sendFrame(bitmap, pipelineParams) {
    if (isProcessing.value) {
      bitmap.close()
      return
    }
    isProcessing.value = true
    worker.postMessage({ type: 'frame', bitmap, pipelineParams }, [bitmap])
  }

  /**
   * Reconfigure pipeline step order.
   * @param {{ instanceId: string, pluginId: string }[]} steps
   */
  function configure(steps) {
    worker.postMessage({ type: 'config', steps })
  }

  onUnmounted(() => {
    // Close any bitmaps still held before terminating
    for (const step of stepResults.value) step?.bitmap?.close()
    worker.terminate()
  })

  return { stepResults, isProcessing, sendFrame, configure }
}
