<script setup>
import { ref, computed } from 'vue'
import { usePipelineStore }   from '@/stores/pipeline.js'
import { BLOCKS, BLOCK_REGISTRIES, allPlugins } from '@/plugins/index.js'

const store = usePipelineStore()

// ── Filter / insert picker ────────────────────────────────────────────────────
// ctx = { blockId, beforeInstanceId, mode: 'add'|'replace', replaceInstanceId, whitelist? }
const pickerCtx     = ref(null)
const pickerPlugins = computed(() => {
  if (!pickerCtx.value) return []
  if (pickerCtx.value.mode === 'replace') {
    return (pickerCtx.value.whitelist ?? []).map(id => allPlugins.get(id)).filter(Boolean)
  }
  const reg = BLOCK_REGISTRIES[pickerCtx.value.blockId]
  return reg ? [...reg.values()] : []
})
const pickerTitle = computed(() => {
  if (!pickerCtx.value) return ''
  if (pickerCtx.value.mode === 'replace') return 'Change Vectorizer'
  const blockLabel = BLOCKS.find(b => b.id === pickerCtx.value.blockId)?.label ?? ''
  return `Add ${blockLabel} Filter`
})

function closePicker() { pickerCtx.value = null }

function openAppend(blockId) {
  pickerCtx.value = { blockId, beforeInstanceId: null, mode: 'add' }
}

function openInsert(blockId, beforeInstanceId) {
  pickerCtx.value = { blockId, beforeInstanceId, mode: 'add' }
}

function openReplace(instanceId, whitelist) {
  const step = store.steps.find(s => s.instanceId === instanceId)
  if (!step) return
  pickerCtx.value = { blockId: step.blockId, mode: 'replace', replaceInstanceId: instanceId, whitelist }
}

function addPlugin(pluginId) {
  const ctx = pickerCtx.value
  if (ctx.mode === 'replace') {
    store.replaceStep(ctx.replaceInstanceId, pluginId)
  } else if (ctx.beforeInstanceId) {
    store.addStepBefore(ctx.beforeInstanceId, pluginId)
  } else {
    store.addStep(ctx.blockId, pluginId)
  }
  closePicker()
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
const dragId  = ref(null)
const dropId  = ref(null)

function onDragStart(instanceId) { dragId.value = instanceId }
function onDragOver(instanceId)  { if (dragId.value && dragId.value !== instanceId) dropId.value = instanceId }
function onDragEnd() {
  if (dragId.value && dropId.value) {
    const fromIdx = store.steps.findIndex(s => s.instanceId === dragId.value)
    const toIdx   = store.steps.findIndex(s => s.instanceId === dropId.value)
    if (fromIdx !== -1 && toIdx !== -1 &&
        store.steps[fromIdx].blockId === store.steps[toIdx].blockId) {
      const dir = toIdx > fromIdx ? 1 : -1
      let cur = fromIdx
      while (cur !== toIdx) { store.moveStep(store.steps[cur].instanceId, dir); cur += dir }
    }
  }
  dragId.value = null
  dropId.value = null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stepsForBlock(blockId) {
  return store.steps
    .map((s, i) => ({ ...s, index: i }))
    .filter(s => s.blockId === blockId)
}

function pluginLabel(step) {
  return allPlugins.get(step.pluginId)?.label ?? step.pluginId
}

function canRemove(step) {
  if (store.isMandatoryFirst(step.instanceId)) return false
  return !BLOCKS.find(b => b.id === step.blockId)?.fixed
}

function mandatoryWhitelist(step) {
  const block = BLOCKS.find(b => b.id === step.blockId)
  return block?.mandatoryFirst?.whitelist ?? []
}
</script>

<template>
  <nav class="pipeline-bar">
    <template v-for="(block, bi) in BLOCKS" :key="block.id">

      <!-- Between-block SVG arrow connector -->
      <div v-if="bi > 0" class="block-arrow">
        <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
          <path d="M0 8 H24 M17 2 L24 8 L17 14"
                stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- Block zone: enclosed group of steps -->
      <div class="block-zone" :class="block.id">
        <span class="zone-label">{{ block.label }}</span>

        <div class="zone-chips">
          <template v-for="(step, si) in stepsForBlock(block.id)" :key="step.instanceId">

            <!-- Within-block hoverable connector (insert position) -->
            <div
              v-if="si > 0 && canRemove(step)"
              class="chip-conn"
              @click="openInsert(block.id, step.instanceId)"
            >
              <span class="conn-arrow">›</span>
              <span class="conn-plus">+</span>
            </div>
            <span v-else-if="si > 0" class="chip-sep">›</span>

            <!-- Step chip -->
            <button
              class="step-chip"
              :class="{
                active:     step.index === store.activeIndex,
                dragging:   step.instanceId === dragId,
                droptarget: step.instanceId === dropId,
                mandatory:  store.isMandatoryFirst(step.instanceId),
              }"
              :draggable="canRemove(step)"
              @click="store.setActive(step.index)"
              @dragstart="onDragStart(step.instanceId)"
              @dragover.prevent="onDragOver(step.instanceId)"
              @dragend="onDragEnd"
            >
              <span class="chip-num">{{ step.index + 1 }}</span>
              {{ pluginLabel(step) }}

              <!-- Swap icon for mandatory-first with multiple options -->
              <span
                v-if="store.isMandatoryFirst(step.instanceId) && mandatoryWhitelist(step).length > 1"
                class="chip-swap"
                title="Change"
                @click.stop="openReplace(step.instanceId, mandatoryWhitelist(step))"
              >⇄</span>

              <!-- Remove icon for non-mandatory steps -->
              <span
                v-else-if="canRemove(step)"
                class="chip-remove"
                title="Remove"
                @click.stop="store.removeStep(step.instanceId)"
              >×</span>
            </button>
          </template>

          <!-- Append button for non-fixed blocks -->
          <button
            v-if="!block.fixed"
            class="zone-add"
            :class="{ active: pickerCtx?.blockId === block.id && !pickerCtx?.beforeInstanceId }"
            @click="openAppend(block.id)"
            :title="`Add ${block.label} filter`"
          >+</button>
        </div>
      </div>
    </template>

    <!-- Filter picker (teleported so it overlays everything) -->
    <Teleport to="body">
      <div v-if="pickerCtx" class="picker-backdrop" @click="closePicker" />
      <div v-if="pickerCtx" class="picker-panel">
        <div class="picker-head">{{ pickerTitle }}</div>
        <button
          v-for="p in pickerPlugins"
          :key="p.id"
          class="picker-item"
          @click="addPlugin(p.id)"
        >
          <span class="pi-label">{{ p.label }}</span>
          <span class="pi-desc">{{ p.description }}</span>
        </button>
        <p v-if="pickerPlugins.length === 0" class="picker-empty">No filters available</p>
      </div>
    </Teleport>
  </nav>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

// ── Block colours ─────────────────────────────────────────────────────────────
@c-image:  #9d7fe0;
@c-vector: #52c97a;
@c-grbl:   @accent;

.pipeline-bar {
  flex: 1;
  display: flex;
  align-items: flex-end;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  padding: 0 0 8px;
  gap: 4px;
}

// ── Between-block arrow ───────────────────────────────────────────────────────
.block-arrow {
  display: flex;
  align-items: center;
  padding-bottom: 12px;
  color: lighten(@muted, 20%);
  flex-shrink: 0;
}

// ── Block zone ────────────────────────────────────────────────────────────────
.block-zone {
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-radius: 8px;
  padding: 5px 7px 6px;
  border: 1px solid;

  &.image  { border-color: fade(@c-image,  25%); background: fade(@c-image,  5%); }
  &.vector { border-color: fade(@c-vector, 25%); background: fade(@c-vector, 5%); }
  &.grbl   { border-color: fade(@c-grbl,   25%); background: fade(@c-grbl,   5%); }
}

.zone-label {
  font-size: 6.5px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding: 0 2px;

  .image  & { color: @c-image;  }
  .vector & { color: @c-vector; }
  .grbl   & { color: @c-grbl;   }
}

.zone-chips {
  display: flex;
  align-items: center;
  gap: 3px;
}

// ── Step chip ─────────────────────────────────────────────────────────────────
.step-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 14px;
  border: 1px solid @border;
  background: @surface2;
  font-size: 11px;
  font-family: inherit;
  font-weight: 500;
  color: @muted;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s, border-color 0.12s, background 0.12s;

  &:hover { color: @text; border-color: lighten(@border, 12%); }

  &.active {
    color: @accent;
    border-color: fade(@accent, 50%);
    background: fade(@accent, 10%);
  }

  &.dragging   { opacity: 0.35; }
  &.droptarget { border-color: @accent; border-style: dashed; }
}

.chip-num {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: @border;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;

  .active & { background: @accent; color: #111; }
}

.chip-remove {
  font-size: 11px;
  line-height: 1;
  color: @muted;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s;
  margin-left: 2px;

  .step-chip:hover & { opacity: 1; }
  &:hover { color: #e05050 !important; }
}

.chip-swap {
  font-size: 11px;
  line-height: 1;
  color: @muted;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s;
  margin-left: 2px;

  .step-chip:hover & { opacity: 1; }
  &:hover { color: @accent !important; }
}

// ── Within-block connector ────────────────────────────────────────────────────
.chip-sep {
  font-size: 10px;
  color: @border;
  pointer-events: none;
  line-height: 1;
}

.chip-conn {
  position: relative;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  .conn-arrow {
    font-size: 10px;
    color: @border;
    transition: opacity 0.12s;
  }
  .conn-plus {
    position: absolute;
    font-size: 12px;
    font-weight: 700;
    color: @accent;
    opacity: 0;
    transition: opacity 0.12s;
  }
  &:hover .conn-arrow { opacity: 0; }
  &:hover .conn-plus  { opacity: 1; }
}

// ── Append button ─────────────────────────────────────────────────────────────
.zone-add {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px dashed @border;
  background: none;
  color: @muted;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: color 0.12s, border-color 0.12s, background 0.12s;

  &:hover, &.active {
    color: @accent;
    border-color: @accent;
    border-style: solid;
    background: fade(@accent, 8%);
  }
}
</style>

<!-- Global styles for teleported picker -->
<style lang="less">
@import '@/assets/theme.less';

.picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.picker-panel {
  position: fixed;
  top: 96px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: @surface;
  border: 1px solid @border;
  border-radius: 8px;
  padding: 8px;
  min-width: 270px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.picker-head {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: @muted;
  padding: 4px 8px 7px;
  border-bottom: 1px solid @border;
  margin-bottom: 3px;
}

.picker-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 6px;
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.1s, border-color 0.1s;

  &:hover {
    background: @surface2;
    border-color: @border;
  }

  .pi-label {
    font-size: 12px;
    font-weight: 600;
    color: @text;
  }

  .pi-desc {
    font-size: 10px;
    color: @muted;
    line-height: 1.4;
  }
}

.picker-empty {
  font-size: 11px;
  color: @muted;
  padding: 8px 10px;
  text-align: center;
}
</style>
