<script setup>
import { inject, computed } from 'vue'
import { usePipelineStore } from '@/stores/pipeline.js'
import PresetSelect from './widgets/PresetSelect.vue'

const props = defineProps({
  plugin:     Object,
  values:     Object,
  instanceId: String,
})

const store         = usePipelineStore()
const camera        = inject('camera', null)
const cameraDevices = computed(() => camera?.devices.value ?? [])

// Resolve options — supports static array or function(camera, values)
function resolveOptions(param) {
  return typeof param.options === 'function'
    ? param.options({ camera, values: props.values })
    : param.options
}

function onRange(key, e) {
  store.updateStepParam(props.instanceId, key, Number(e.target.value))
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

      <hr v-if="param.type === 'sep'" class="sep" />

      <div v-else-if="param.type === 'display'" class="display-row">
        <span class="dl">{{ param.label }}</span>
        <span class="dv">{{ param.compute(values, { camera }) }}</span>
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

      <div v-else-if="param.type === 'camera-select'" class="param-row">
        <div class="param-label"><span>{{ param.label }}</span></div>
        <select class="p-select" :value="values[param.key]" @change="onCameraSelect(param.key, $event)">
          <option value="">Default camera</option>
          <option v-for="dev in cameraDevices" :key="dev.deviceId" :value="dev.deviceId">
            {{ dev.label || dev.deviceId.slice(0, 12) }}
          </option>
        </select>
      </div>

      <div v-else-if="param.type === 'select'" class="param-row">
        <div class="param-label"><span>{{ param.label }}</span></div>
        <select class="p-select" :value="values[param.key]" @change="onSelect(param, $event)">
          <option v-for="opt in param.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

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
  <div v-else class="no-params">—</div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

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
  font-size: 10px;
  color: @muted;
}

.val {
  color: @text;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

input[type='range'] {
  width: 100%;
  accent-color: var(--bc, @accent);
  cursor: pointer;
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

  .dl { font-size: 10px; color: @muted; }
  .dv { font-size: 12px; font-weight: 700; color: @accent; font-variant-numeric: tabular-nums; }
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
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
  background: @surface2;
  color: @text;
  border: 1px solid @border;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 11px;
  cursor: pointer;
  outline: none;
  font-family: inherit;

  &:focus { border-color: @accent; }
}
</style>
