<script setup>
import { ref, watchEffect } from 'vue'

/** Tiny live thumbnail of a step result, shown in a collapsed step header. */
const props = defineProps({ result: Object })

const canvasRef = ref(null)

watchEffect(() => {
  const canvas = canvasRef.value
  const bmp    = props.result?.bitmap
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0c10'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (!bmp) return
  const s  = Math.min(canvas.width / bmp.width, canvas.height / bmp.height)
  const dw = bmp.width * s, dh = bmp.height * s
  ctx.drawImage(bmp, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh)
}, { flush: 'post' })
</script>

<template>
  <canvas ref="canvasRef" class="step-thumb" width="64" height="40" />
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.step-thumb {
  width: 64px;
  height: 40px;
  border-radius: 4px;
  border: 1px solid @border;
  flex-shrink: 0;
}
</style>
