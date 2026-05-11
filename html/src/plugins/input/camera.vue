<script setup>
import { ref, inject, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  values: Object,
})

const camera          = inject('camera')
const captureSnapshot = inject('captureSnapshot')
const frozenBitmap    = inject('frozenBitmap')

const videoRef = ref(null)
const flashing = ref(false)

function attachStream() {
  const s = camera?.getStream()
  if (videoRef.value && s) {
    videoRef.value.srcObject = s
    videoRef.value.play().catch(() => {})
  }
}

onMounted(attachStream)
watch(() => camera?.isReady.value, (ready) => { if (ready) attachStream() })

async function onShutter() {
  flashing.value = true
  await captureSnapshot()
  await nextTick()
  requestAnimationFrame(() => { flashing.value = false })
}
</script>

<template>
  <div class="camera-wrap">
    <video ref="videoRef" class="video" autoplay muted playsinline />

    <!-- Flash overlay -->
    <div class="flash" :class="{ active: flashing }" />

    <div v-if="camera?.error.value" class="error-overlay">
      {{ camera.error.value }}
    </div>

    <!-- Shutter button -->
    <div class="shutter-overlay">
      <button class="shutter-btn" :title="frozenBitmap ? 'Re-capture' : 'Capture frame'" @click="onShutter">
        <span class="shutter-ring" />
      </button>
    </div>

    <div class="status">
      <span class="dot" :class="{ live: camera?.isReady.value && !frozenBitmap, captured: frozenBitmap }" />
      {{ frozenBitmap ? 'Captured' : camera?.isReady.value ? 'Live' : 'Connecting…' }}
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.camera-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: #000;
}

.video {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  max-height: calc(100% - 29px);
}

// ── Flash effect ──────────────────────────────────────────────────────────────
.flash {
  position: absolute;
  inset: 0;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s ease-out;
  &.active {
    opacity: 0.92;
    transition: none;
  }
}

.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.7);
  color: #f55;
  font-size: 11px;
  padding: 12px;
  text-align: center;
}

// ── Shutter button ────────────────────────────────────────────────────────────
.shutter-overlay {
  position: absolute;
  bottom: 40px;
  left: 0; right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.shutter-btn {
  pointer-events: all;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #cc2222;
  border: 3px solid rgba(255,255,255,0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 14px rgba(0,0,0,0.6);
  transition: background 0.15s, transform 0.1s;
  &:hover  { background: #e03333; transform: scale(1.06); }
  &:active { transform: scale(0.93); }
}

.shutter-ring {
  display: block;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.35);
}

// ── Status bar ────────────────────────────────────────────────────────────────
.status {
  width: 100%;
  padding: 6px 10px;
  border-top: 1px solid @border;
  font-size: 10px;
  color: @muted;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: @border;
  transition: background 0.3s;
  &.live     { background: #4caf50; animation: blink 1.6s ease-in-out infinite; }
  &.captured { background: @accent; animation: none; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
</style>
