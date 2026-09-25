<script setup>
import { computed } from 'vue'

/**
 * Width × height (with a chain that keeps them in proportion) and depth, in mm.
 *
 *   value    — { w, h, d, locked }; null means "as it comes in"
 *   current  — the size coming in, { w, h, d } in mm — shown for whatever isn't set
 *
 * Linked, only the size typed last is stored; the other one follows the paths' proportions,
 * so it stays right when the paths change (new picture, other filters).
 */
const props = defineProps({
  value:   { type: Object, default: () => ({}) },
  current: { type: Object, default: null },
})
const emit = defineEmits(['update'])

const aspect = computed(() => props.current?.w > 0 ? props.current.h / props.current.w : null)

// What the fields show: the set size, the linked one derived from it, or the size coming in
const shown = computed(() => {
  const { w = null, h = null, d = null, locked } = props.value ?? {}
  const cur = props.current, a = aspect.value
  let sw = w ?? cur?.w ?? null, sh = h ?? cur?.h ?? null
  if (locked && a) {
    if (w != null)      sh = w * a
    else if (h != null) sw = h / a
  }
  return { w: sw, h: sh, d: d ?? cur?.d ?? null }
})

const fmt = n => n == null ? '' : String(Math.round(n * 10) / 10)

function set(key, e) {
  const text = e.target.value.trim()
  const n = Number(text)
  if (text !== '' && !(Number.isFinite(n) && n > 0)) { e.target.value = fmt(shown.value[key]); return }
  const v = { ...props.value, [key]: text === '' ? null : n }
  if (v.locked && key !== 'd') v[key === 'w' ? 'h' : 'w'] = null   // linked: the other one follows
  emit('update', v)
}

function toggleLock() {
  const v = { ...props.value, locked: !props.value?.locked }
  if (v.locked) {
    if (v.w != null) v.h = null                        // keep the width, the height follows
  } else if (v.w != null || v.h != null) {
    v.w = shown.value.w; v.h = shown.value.h           // unlink where it stands — nothing jumps
  }
  emit('update', v)
}
</script>

<template>
  <div class="size">
    <div class="row">
      <label class="dim">
        <span>Width</span>
        <input type="number" min="0.1" step="0.1" :value="fmt(shown.w)" :class="{ auto: value?.w == null }" @change="set('w', $event)" />
      </label>
      <button
        class="link"
        :class="{ on: value?.locked }"
        :title="value?.locked ? 'Width and height stay in proportion — click to set them on their own' : 'Keep width and height in proportion'"
        @click="toggleLock"
      >
        <svg v-if="value?.locked" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1M3 3l1.5 1.5M13 13l-1.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <label class="dim">
        <span>Height</span>
        <input type="number" min="0.1" step="0.1" :value="fmt(shown.h)" :class="{ auto: value?.h == null }" @change="set('h', $event)" />
      </label>
    </div>
    <label class="dim depth">
      <span>Max depth</span>
      <input type="number" min="0.1" step="0.1" :value="fmt(shown.d)" :class="{ auto: value?.d == null }" @change="set('d', $event)" />
    </label>
    <p class="hint">in mm — leave a field empty to keep the size coming in</p>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.size { display: flex; flex-direction: column; gap: 8px; }

.row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 6px;
}

.dim {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: @muted;

  input {
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

    &:focus { border-color: @accent-line; }
    &.auto  { color: @muted; }                   // not set: the size coming in, or derived
  }
}
.depth { max-width: calc(50% - 20px); }

.link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 27px;
  border: 1px solid @border;
  border-radius: 5px;
  background: none;
  color: @muted;
  cursor: pointer;

  &:hover { color: @text; }
  &.on    { color: @accent; border-color: @accent-line; }
}

.hint { margin: 0; font-size: 11px; color: @muted; opacity: 0.8; }
</style>
