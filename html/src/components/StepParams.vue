<script setup>
import { inject, computed } from 'vue'
import { usePipelineStore } from '@/stores/pipeline.js'
import PresetSelect from './widgets/PresetSelect.vue'
import { UPLOAD } from '@/plugins/input/camera.js'

const props = defineProps({
  plugin:     Object,
  values:     Object,
  instanceId: String,
})

const store         = usePipelineStore()
const camera        = inject('camera', null)
// Webcams listed before the camera permission was granted have no id — they cannot be chosen
const cameraDevices = computed(() => (camera?.devices.value ?? []).filter(d => d.deviceId))
const captureSnapshot = inject('captureSnapshot', null)
const pickImage       = inject('pickImage', null)

// Context for a param's `when(values, ctx)` and `compute(values, ctx)`
const ctx = computed(() => ({ camera }))

const cameraLabel = (dev, i) =>
  (dev.label?.replace(/\s*\([0-9a-f:]+\)\s*$/i, '').trim()) || `Camera ${i + 1}`

// Resolve options — supports static array or function(camera, values)
function resolveOptions(param) {
  return typeof param.options === 'function'
    ? param.options({ camera, values: props.values })
    : param.options
}

function onRange(key, e) {
  store.updateStepParam(props.instanceId, key, Number(e.target.value))
}
function onNumber(param, e) {
  const n = Number(e.target.value)
  if (e.target.value === '' || !Number.isFinite(n)) { e.target.value = props.values[param.key]; return }
  const clamped = Math.min(param.max ?? Infinity, Math.max(param.min ?? -Infinity, n))
  if (clamped !== n) e.target.value = clamped
  store.updateStepParam(props.instanceId, param.key, clamped)
}
function onToggle(key) {
  store.updateStepParam(props.instanceId, key, !props.values[key])
}
function onCameraSelect(key, e) {
  store.updateStepParam(props.instanceId, key, e.target.value)
}
function onSelect(param, e) {
  const value = e.target.value
  store.updateStepParam(props.instanceId, param.key, value)
  if (param.applyPreset) {
    for (const [k, v] of Object.entries(param.applyPreset(value) ?? {}))
      store.updateStepParam(props.instanceId, k, v)
  }
}
</script>

<template>
  <template v-if="plugin?.params?.length">
    <template v-for="(param, i) in plugin.params" :key="i">
    <template v-if="!param.when || param.when(values, ctx)">

      <hr v-if="param.type === 'sep'" class="sep" />

      <div v-else-if="param.type === 'heading'" class="heading">{{ param.label }}</div>

      <label v-else-if="param.type === 'number'" class="field">
        <span>{{ param.label }}<span v-if="param.unit" class="unit"> ({{ param.unit }})</span></span>
        <input
          type="number"
          :min="param.min" :max="param.max" :step="param.step ?? 1"
          :value="values[param.key]"
          @change="onNumber(param, $event)"
        />
      </label>

      <div v-else-if="param.type === 'display'" class="display-row">
        <span class="dl">{{ param.label }}</span>
        <span class="dv">{{ param.compute(values, ctx) }}</span>
      </div>

      <div v-else-if="param.type === 'range'" class="param-row">
        <div class="param-label">
          <span>{{ param.label }}</span>
          <span class="val">{{ values[param.key] }}{{ param.unit ?? '' }}</span>
        </div>
        <input
          type="range"
          :min="param.min" :max="param.max" :step="param.step ?? 1"
          :value="values[param.key]"
          @input="onRange(param.key, $event)"
        />
      </div>

      <div v-else-if="param.type === 'toggle'" class="toggle-row">
        <span>{{ param.label }}</span>
        <div class="switch" :class="{ on: values[param.key] }" @click="onToggle(param.key)" />
      </div>

      <!-- Picture source: a webcam or an uploaded file, and the matching action right below -->
      <template v-else-if="param.type === 'source-select'">
        <label class="field">
          <span>{{ param.label }}</span>
          <select class="p-select" :value="values[param.key]" @change="onCameraSelect(param.key, $event)">
            <option v-if="!cameraDevices.length" value="">Webcam</option>
            <option v-for="(dev, i) in cameraDevices" :key="dev.deviceId" :value="dev.deviceId">
              {{ cameraLabel(dev, i) }}
            </option>
            <option :value="UPLOAD">Upload image</option>
          </select>
        </label>
        <button v-if="values[param.key] === UPLOAD" class="source-btn" @click="pickImage?.()">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 11V2.5M4.5 6L8 2.5 11.5 6M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Upload image
        </button>
        <button v-else class="source-btn" title="Use the current live picture for all steps" @click="captureSnapshot?.()">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="4" width="13" height="9.5" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 4l1-2h3l1 2" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="8.7" r="2.4" stroke="currentColor" stroke-width="1.4"/></svg>
          Take snapshot
        </button>
      </template>

      <label v-else-if="param.type === 'select'" class="field">
        <span>{{ param.label }}</span>
        <select class="p-select" :value="values[param.key]" @change="onSelect(param, $event)">
          <option v-for="opt in param.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>

      <div v-else-if="param.type === 'preset-select'" class="param-row">
        <div class="param-label"><span>{{ param.label }}</span></div>
        <PresetSelect
          :value="values[param.key]"
          :options="resolveOptions(param)"
          @change="store.updateStepParam(instanceId, param.key, $event)"
        />
      </div>

    </template>
    </template>
  </template>
  <div v-else class="no-params">—</div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.source-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  height: 36px;
  margin: 2px 0 6px;
  background: @text;
  border: none;
  border-radius: 999px;
  color: @bg;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.12s;

  &:hover { opacity: 0.88; }
}

.no-params {
  color: @muted;
  font-size: 11px;
  text-align: center;
  padding: 8px 0;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.param-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: @muted;
}

.val {
  color: @text;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

input[type='range'] {
  width: 100%;
  accent-color: @accent;
  cursor: pointer;
}

.heading {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: @text;
  padding-top: 8px;
  border-top: 1px solid @border;

  &:first-child { padding-top: 0; border-top: none; }
}

// Label left, value control right — like PatternMaster's .field rows
.field {
  display: grid;
  grid-template-columns: 1fr 130px;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: @muted;

  .unit { opacity: 0.75; }

  input[type='number'] {
    width: 100%;
    min-width: 0;
    background: @bg;
    color: @text;
    border: 1px solid @border;
    border-radius: 5px;
    padding: 4px 6px;
    font: inherit;
    font-variant-numeric: tabular-nums;
    outline: none;

    &:focus { border-color: @accent; }
  }

}

.sep {
  border: none;
  border-top: 1px solid @border;
  margin: 0;
}

.display-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: @surface2;
  border: 1px solid @border;
  border-radius: 5px;

  .dl { font-size: 12px; color: @muted; }
  .dv { font-size: 12px; font-weight: 700; color: @accent; font-variant-numeric: tabular-nums; }
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: @muted;
}

.switch {
  width: 30px;
  height: 16px;
  border-radius: 8px;
  background: @border;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }

  &.on {
    background: @accent;
    &::after { transform: translateX(14px); }
  }
}

.p-select {
  width: 100%;
  background: @bg;
  color: @text;
  border: 1px solid @border;
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
  outline: none;
  font-family: inherit;

  &:focus { border-color: @accent; }
}
</style>
