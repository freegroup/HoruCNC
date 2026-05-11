<script setup>
import { inject, computed } from 'vue'
import { usePipelineStore } from '@/stores/pipeline.js'
import { allPlugins } from '@/plugins/index.js'
import StepParams from './StepParams.vue'

const props = defineProps({
  step:         Object,
  blockColor:   String,
  canRemove:    Boolean,
  isMandatory:  Boolean,
  whitelist:    { type: Array, default: () => [] },
})

const emit = defineEmits(['remove', 'replace'])

const store           = usePipelineStore()
const camera          = inject('camera',          null)
const captureSnapshot = inject('captureSnapshot', null)
const frozenBitmap    = inject('frozenBitmap',    null)

const plugin   = computed(() => allPlugins.get(props.step.pluginId))
const isCamera = computed(() => plugin.value?.inputType === 'none')
</script>

<template>
  <div
    class="step-card"
    :style="{ '--bc': blockColor }"
    @dragover.prevent.stop
  >
    <!-- Header -->
    <div class="card-head">
      <span class="step-num">{{ step.index + 1 }}</span>
      <span class="step-name">{{ plugin?.label ?? step.pluginId }}</span>
      <span class="head-space" />
      <button
        v-if="isMandatory && whitelist.length > 1"
        class="ctrl-btn"
        title="Change"
        @click.stop="emit('replace')"
      >⇄</button>
      <button
        v-else-if="canRemove"
        class="ctrl-btn remove"
        title="Remove"
        @click.stop="emit('remove')"
      >×</button>
    </div>

    <!-- Parameters -->
    <div class="card-params">
      <StepParams
        :plugin="plugin"
        :values="step.values"
        :instance-id="step.instanceId"
      />
    </div>

    <!-- Shutter button (camera only) -->
    <div v-if="isCamera" class="capture-area">
      <div class="capture-status">
        <span class="dot" :class="{ live: !frozenBitmap?.value, captured: frozenBitmap?.value }" />
        {{ frozenBitmap?.value ? 'Captured' : camera?.isReady.value ? 'Live' : 'Connecting…' }}
      </div>
      <button
        class="capture-btn"
        :class="{ frozen: frozenBitmap?.value }"
        :title="frozenBitmap?.value ? 'Re-capture' : 'Capture frame'"
        @click="captureSnapshot?.()"
      >
        <span class="capture-ring" />
      </button>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.step-card {
  width: 214px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: @surface;
  border: 1px solid @border;
  border-left: 3px solid var(--bc, @border);
  border-radius: 10px;
  overflow: hidden;
  transition: opacity 0.15s, border-color 0.15s, box-shadow 0.15s;
  box-shadow: @card-shadow;

  &:hover     { box-shadow: 0 6px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06) inset; }
  &.droptarget { border-color: @accent; }
}

.card-params {
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

// ── Header ────────────────────────────────────────────────────────────────────
.card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 9px 8px 10px;
  border-bottom: 1px solid @border;
  flex-shrink: 0;
  background: linear-gradient(135deg, fade(#000, 30%), fade(#000, 10%));
}

.step-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bc, @border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: #111;
  flex-shrink: 0;
}

.step-name {
  font-size: 11px;
  font-weight: 600;
  color: @text;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.head-space { flex: 1; min-width: 0; }

.ctrl-btn {
  width: 18px;
  height: 18px;
  background: none;
  border: none;
  cursor: pointer;
  color: @muted;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;

  .step-card:hover & { opacity: 1; }
  &.remove:hover     { color: #e05050; }
  &:not(.remove):hover { color: @accent; }
}

// ── Shutter button ────────────────────────────────────────────────────────────
.capture-area {
  border-top: 1px solid @border;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  background: fade(#000, 10%);
}

.capture-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: @muted;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: @border;
  transition: background 0.3s;
  flex-shrink: 0;

  &.live     { background: #4caf50; animation: blink 1.6s ease-in-out infinite; }
  &.captured { background: @accent; animation: none; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.capture-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #cc2222;
  border: 3px solid rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, transform 0.1s;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);

  &:hover  { background: #e03333; transform: scale(1.07); }
  &:active { transform: scale(0.92); }
  &.frozen { background: @accent; }
}

.capture-ring {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
}
</style>
