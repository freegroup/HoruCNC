<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  value:   [Number, String],
  options: Array,
})
const emit = defineEmits(['change'])

const open       = ref(false)
const triggerRef = ref(null)
const dropPos    = ref({ top: 0, left: 0, width: 0 })

const current = computed(() => props.options?.find(o => o.value === props.value) ?? props.options?.[0])

function toggle() {
  if (!open.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    dropPos.value = { top: rect.bottom + 4, left: rect.left, width: rect.width }
  }
  open.value = !open.value
}

function select(val) {
  emit('change', val)
  open.value = false
}

function onDocClick(e) {
  if (!triggerRef.value?.contains(e.target)) open.value = false
}

onMounted(()  => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div class="preset-select">
    <button ref="triggerRef" class="ps-trigger" :class="{ open }" @click="toggle">
      <span class="ps-current">{{ current?.label }}</span>
      <svg class="ps-chevron" :class="{ rotated: open }" width="10" height="6" viewBox="0 0 10 6" fill="none">
        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="ps-dropdown"
        :style="{ top: dropPos.top + 'px', left: dropPos.left + 'px', width: dropPos.width + 'px' }"
      >
        <button
          v-for="opt in options"
          :key="opt.value"
          class="ps-option"
          :class="{ selected: opt.value === value }"
          @click="select(opt.value)"
        >
          <span class="ps-opt-label">{{ opt.label }}</span>
          <span class="ps-opt-desc">{{ opt.desc }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.preset-select {
  position: relative;
  width: 100%;
}

.ps-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: @surface2;
  color: @text;
  border: 1px solid @border;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;

  &:hover, &.open { border-color: @accent; }
}

.ps-current {
  flex: 1;
}

.ps-chevron {
  flex-shrink: 0;
  color: @muted;
  transition: transform 0.15s;
  &.rotated { transform: rotate(180deg); }
}

// ── Dropdown (teleported, but scoped attr still applies) ──────────────────────
.ps-dropdown {
  position: fixed;
  z-index: 9999;
  background: @surface2;
  border: 1px solid @accent;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.ps-option {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.1s;
  border-bottom: 1px solid @border;

  &:last-child { border-bottom: none; }
  &:hover      { background: fade(@accent, 10%); }
  &.selected   { background: fade(@accent, 15%); }
}

.ps-opt-label {
  font-size: 11px;
  font-weight: 600;
  color: @text;

  .selected & { color: @accent; }
}

.ps-opt-desc {
  font-size: 10px;
  color: @muted;
  line-height: 1.3;
}
</style>
