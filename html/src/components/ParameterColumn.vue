<script setup>
import { inject, computed } from 'vue'
import { usePipelineStore } from '@/stores/pipeline.js'

const props = defineProps({
  plugin: Object,
  values: Object,
})

const store  = usePipelineStore()
const camera = inject('camera')

const cameraDevices = computed(() => camera?.devices.value ?? [])

function onRange(key, event) {
  store.updateParam(key, Number(event.target.value))
}

function onToggle(key) {
  store.updateParam(key, !props.values[key])
}

function onCameraSelect(key, event) {
  store.updateParam(key, event.target.value)
}

function onSelect(param, event) {
  const value = event.target.value
  store.updateParam(param.key, value)
  if (param.applyPreset) {
    const patches = param.applyPreset(value)
    for (const [k, v] of Object.entries(patches ?? {})) {
      store.updateParam(k, v)
    }
  }
}
</script>

<template>
  <section class="column">
    <div class="col-label">Parameter</div>
    <div class="col-card">
      <div v-if="plugin" class="param-list">
        <template v-for="(param, i) in plugin.params" :key="i">

          <hr v-if="param.type === 'sep'" class="sep" />

          <div v-else-if="param.type === 'display'" class="display-row">
            <span class="display-label">{{ param.label }}</span>
            <span class="display-val">{{ param.compute(values) }}</span>
          </div>

          <div v-else-if="param.type === 'range'" class="param-row">
            <div class="param-label">
              <span>{{ param.label }}</span>
              <span class="val">{{ values[param.key] }}{{ param.unit ?? '' }}</span>
            </div>
            <input
              type="range"
              :min="param.min"
              :max="param.max"
              :step="param.step ?? 1"
              :value="values[param.key]"
              @input="onRange(param.key, $event)"
            />
          </div>

          <div v-else-if="param.type === 'toggle'" class="toggle-row">
            <span>{{ param.label }}</span>
            <div
              class="switch"
              :class="{ on: values[param.key] }"
              @click="onToggle(param.key)"
            />
          </div>

          <div v-else-if="param.type === 'camera-select'" class="param-row">
            <div class="param-label"><span>{{ param.label }}</span></div>
            <select
              class="cam-select"
              :value="values[param.key]"
              @change="onCameraSelect(param.key, $event)"
            >
              <option value="">Default camera</option>
              <option
                v-for="dev in cameraDevices"
                :key="dev.deviceId"
                :value="dev.deviceId"
              >{{ dev.label || dev.deviceId.slice(0, 12) }}</option>
            </select>
          </div>

          <div v-else-if="param.type === 'select'" class="param-row">
            <div class="param-label"><span>{{ param.label }}</span></div>
            <select
              class="cam-select"
              :value="values[param.key]"
              @change="onSelect(param, $event)"
            >
              <option
                v-for="opt in param.options"
                :key="opt.value"
                :value="opt.value"
              >{{ opt.label }}</option>
            </select>
          </div>

        </template>
      </div>
      <div v-else class="placeholder">No parameters</div>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';
@import './column.less';

.param-list {
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 1;
  overflow-y: auto;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  accent-color: @accent;
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
  padding: 8px 12px;
  background: @surface2;
  border: 1px solid @border;
  border-radius: 6px;

  .display-label {
    font-size: 10px;
    color: @muted;
  }

  .display-val {
    font-size: 13px;
    font-weight: 700;
    color: @accent;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.03em;
  }
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

.cam-select {
  width: 100%;
  background: @surface2;
  color: @text;
  border: 1px solid @border;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 11px;
  cursor: pointer;
  outline: none;

  &:focus { border-color: @accent; }
}
</style>
