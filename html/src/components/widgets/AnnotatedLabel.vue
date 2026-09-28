<script>
import { ref } from 'vue'

// One help open at a time, across all steps
const openId = ref(null)
</script>

<script setup>
import { computed, watch, nextTick, onUnmounted } from 'vue'
import { helpFor } from '@/help/help.js'

/**
 * A setting's label with its help: the text, an optional unit and — when help/help.js has an
 * entry for `id` — a (?) that opens the help next to it. A click beside it, Esc or scrolling
 * closes it. The popover stays in place in the DOM (position: fixed), so it also shows in
 * fullscreen.
 */
const props = defineProps({
  id:   { type: String, required: true },     // '<pluginId>.<param key>'
  text: { type: String, required: true },
  unit: { type: String, default: '' },
})

const entry  = computed(() => helpFor(props.id))
const isOpen = computed(() => openId.value === props.id)
const btn    = ref(null)
const pop    = ref(null)
const pos    = ref({ left: 0, top: 0 })

function toggle() { openId.value = isOpen.value ? null : props.id }
function close()  { if (isOpen.value) openId.value = null }
const onKey = e => { if (e.key === 'Escape') close() }
const onDocDown = e => { if (!btn.value?.contains(e.target) && !pop.value?.contains(e.target)) close() }

// Right of the (?) if there is room, else left of it; always inside the window
async function place() {
  await nextTick()
  const r = btn.value?.getBoundingClientRect(), p = pop.value
  if (!r || !p) return
  const pw = p.offsetWidth, ph = p.offsetHeight
  let left = r.right + 10
  if (left + pw > window.innerWidth - 8) left = r.left - pw - 10
  pos.value = {
    left: Math.max(8, left),
    top:  Math.max(8, Math.min(r.top - 8, window.innerHeight - ph - 8)),
  }
}

const listen = on => {
  const fn = on ? 'addEventListener' : 'removeEventListener'
  document[fn]('keydown', onKey)
  document[fn]('pointerdown', onDocDown, true)
  window[fn]('scroll', close, true)
  window[fn]('resize', close)
}
watch(isOpen, open => { listen(open); if (open) place() })
onUnmounted(() => { listen(false); close() })
</script>

<template>
  <span class="annotated">{{ text }}<span v-if="unit" class="unit"> ({{ unit }})</span><template v-if="entry">
    <button
      ref="btn"
      type="button"
      class="help-ico"
      :class="{ open: isOpen }"
      :aria-label="`Help for ${text}`"
      @click.stop.prevent="toggle"
    >?</button>
    <div
      v-if="isOpen"
      ref="pop"
      class="help-pop"
      role="dialog"
      :style="{ left: `${pos.left}px`, top: `${pos.top}px` }"
      @click.stop
    >
      <h4>{{ text }}</h4>
      <!-- Our own texts from help.js, never user input -->
      <div class="body" v-html="entry.description" />
    </div>
  </template></span>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.annotated { color: @label; }
.unit      { color: @muted; }

.help-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  margin-left: 6px;
  padding: 0;
  vertical-align: 1px;
  border: 1px solid fade(#fff, 22%);
  border-radius: 50%;
  background: none;
  color: @muted;
  font: 700 9.5px/1 @font;
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;

  &:hover, &.open { color: @accent; border-color: @accent-line; }
}

.help-pop {
  position: fixed;
  z-index: 1200;
  width: 310px;
  max-width: calc(100vw - 24px);
  max-height: 70vh;
  overflow-y: auto;
  padding: 12px 14px;
  background: @surface;
  border: 1px solid @hairline;
  border-radius: 12px;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.6);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.55;
  color: @text;
  text-align: left;
  white-space: normal;
  cursor: auto;

  h4 {
    margin-bottom: 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: @accent;
  }

  .body {
    :deep(p)  { margin: 0 0 8px; }
    :deep(p:last-child) { margin-bottom: 0; }
    :deep(ul) { margin: 0 0 8px; padding-left: 16px; }
    :deep(li) { margin: 2px 0; }
    :deep(b)  { color: #fff; font-weight: 600; }
    :deep(code) {
      padding: 1px 4px;
      border: 1px solid @border;
      border-radius: 4px;
      background: @bg;
      font-family: @mono;
      font-size: 11px;
    }
    :deep(.hint) { color: @muted; }
    :deep(.warn) { color: @danger; }
  }
}
</style>
