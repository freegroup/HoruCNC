import { ref, onUnmounted } from 'vue'

export function useCamera() {
  const devices    = ref(/** @type {MediaDeviceInfo[]} */ ([]))
  const isReady    = ref(false)
  const error      = ref(/** @type {string|null} */ (null))
  const nativeRes  = ref(/** @type {{w:number,h:number}|null} */ (null))

  /** @type {MediaStream|null} */
  let stream = null

  // Internal video element for frame capture — lives as long as the composable,
  // independent of any CameraPreview component lifecycle.
  const captureVideo = document.createElement('video')
  captureVideo.muted      = true
  captureVideo.playsInline = true
  captureVideo.autoplay   = true

  async function enumerateDevices() {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      tmp.getTracks().forEach(t => t.stop())
      const all = await navigator.mediaDevices.enumerateDevices()
      devices.value = all.filter(d => d.kind === 'videoinput')
    } catch (e) {
      error.value = 'Camera permission denied'
    }
  }

  /**
   * Start (or restart) the camera stream.
   * Returns the MediaStream so CameraPreview can attach it to a <video> element.
   * @param {string} [deviceId]
   */
  async function start(deviceId) {
    isReady.value = false
    error.value   = null
    if (stream) stream.getTracks().forEach(t => t.stop())

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
          : { width: 1280, height: 720 },
        audio: false,
      })
      captureVideo.srcObject = stream
      await captureVideo.play()
      nativeRes.value = { w: captureVideo.videoWidth, h: captureVideo.videoHeight }
      isReady.value = true
    } catch (e) {
      error.value = String(e)
    }
    return stream
  }

  /** Returns the live MediaStream (for CameraPreview to attach to its <video>). */
  function getStream() { return stream }

  /** Capture the current frame as a transferable ImageBitmap. */
  async function captureFrame() {
    if (!isReady.value || captureVideo.readyState < 2) return null
    return createImageBitmap(captureVideo)
  }

  function stop() {
    stream?.getTracks().forEach(t => t.stop())
    stream = null
    isReady.value = false
  }

  onUnmounted(stop)

  return { devices, isReady, nativeRes, error, enumerateDevices, start, getStream, captureFrame, stop }
}
