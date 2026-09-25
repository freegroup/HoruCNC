<script setup>
import { inject, computed } from 'vue'
import { usePipelineStore } from '@/stores/pipeline.js'
import { passCount } from '@/plugins/grbl/gcode.worker.js'
import { POSTS, postById } from '@/plugins/grbl/posts.js'
import { downloadFile } from '@/utils/files.js'

/**
 * End of the timeline: pick the machine (post-processor), check the job, download the G-code.
 * The machine choice is kept as the `format` value of the machine-paths step.
 */
const store       = usePipelineStore()
const stepResults = inject('stepResults')

const RAPID_RATE = 3000   // mm/min — only for the time estimate

const pathsStep = computed(() => store.steps.find(s => s.pluginId === 'gcode'))
const result    = computed(() => (stepResults?.value ?? []).find(r => r?.kind === 'gcode') ?? null)
const values    = computed(() => pathsStep.value?.values ?? {})
const post      = computed(() => postById(values.value.format))

function choosePost(id) {
  if (pathsStep.value) store.updateStepParam(pathsStep.value.instanceId, 'format', id)
}

// Kept in the persisted UI state
const fileName = computed({
  get: () => store.ui.fileName,
  set: v => { store.ui.fileName = v },
})

const TOOL = { flat: 'End mill', ball: 'Ball nose', vee: 'V-bit', torus: 'Bullnose' }

const summary = computed(() => {
  const r = result.value, v = values.value
  const m = r?.moves
  if (!m || m.length < 8) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, minZ = 0
  let minutes = 0, cuts = 0
  for (let i = 4; i < m.length; i += 4) {
    const dx = m[i + 1] - m[i - 3], dy = m[i + 2] - m[i - 2], dz = m[i + 3] - m[i - 1]
    const len = Math.hypot(dx, dy, dz)
    if (m[i] === 1) { minutes += len / RAPID_RATE; continue }
    cuts++
    const plunge = Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4 && dz < 0
    minutes += len / ((plunge ? v.plunge : v.feed) || 1)
    minX = Math.min(minX, m[i + 1]); maxX = Math.max(maxX, m[i + 1])
    minY = Math.min(minY, m[i + 2]); maxY = Math.max(maxY, m[i + 2])
    minZ = Math.min(minZ, m[i + 3])
  }
  if (!cuts) return null

  const passes = passCount({ depth: -minZ, stepdown: v.stepdown })   // real depth — also for 3D paths
  const time   = minutes < 1 ? '< 1 min'
    : minutes < 60 ? `${Math.round(minutes)} min`
    : `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`
  return [
    ['Size',     `${(maxX - minX).toFixed(0)} × ${(maxY - minY).toFixed(0)} mm`],
    ['Depth',    `${(-minZ).toFixed(1)} mm · ${passes} ${passes === 1 ? 'pass' : 'passes'}`],
    ['Tool',     `${TOOL[v.tool] ?? 'End mill'} Ø${v.toolDiameter} mm`],
    ['Run time', `about ${time}`],
  ]
})

function download() {
  if (!result.value) return
  const text = post.value.emit(result.value, values.value)
  const name = (fileName.value.trim() || 'horucnc').replace(/\.(nc|gcode|ngc|txt)$/i, '')
  downloadFile(`${name}.${post.value.ext}`, text, 'text/plain')
}
</script>

<template>
  <!-- The card of the Finish section (heading and node come from PipelineFlow) -->
  <div class="finish-card">

      <div class="machines">
        <button
          v-for="p in POSTS"
          :key="p.id"
          class="machine"
          :class="{ active: p.id === post.id }"
          @click="choosePost(p.id)"
        >
          <span class="radio" />
          <span class="m-name">{{ p.name }}</span>
          <span class="m-hint">{{ p.hint }}</span>
        </button>
      </div>

      <dl v-if="summary" class="facts">
        <div v-for="[k, val] in summary" :key="k" class="fact">
          <dt>{{ k }}</dt><dd>{{ val }}</dd>
        </div>
      </dl>
      <p v-else class="empty">Nothing to mill yet — the steps above produce no cutting paths.</p>

      <div class="actions">
        <label class="name">
          <input v-model="fileName" type="text" spellcheck="false" aria-label="File name" />
          <span>.{{ post.ext }}</span>
        </label>
        <button class="download" :disabled="!summary" @click="download">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3.5-3.5M8 10l3.5-3.5M2.5 13.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Download
        </button>
      </div>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.finish-card {
  width: min(100%, var(--row-w, 100%));
  box-sizing: border-box;
  padding: 18px 20px 20px;
  background: @surface2;
  border: 1px solid @hairline;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.machines {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.machine {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 10px;
  align-items: center;
  text-align: left;
  padding: 12px 14px;
  background: @surface;
  border: 1.5px solid @hairline;
  border-radius: 12px;
  color: @text;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;

  &:hover { border-color: @accent-line; }

  .radio {
    grid-row: 1 / 3;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid @muted;
    box-sizing: border-box;
  }
  .m-name { font-size: 14px; font-weight: 700; }
  .m-hint { font-size: 11.5px; color: @muted; }

  &.active {
    border-color: @accent;
    background: @accent-soft;
    .radio { border: 5px solid @accent; }
  }
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin: 0;

  .fact {
    padding: 8px 12px;
    border-radius: 10px;
    background: @surface;
  }
  dt { font-size: 11px; color: @muted; }
  dd { margin: 3px 0 0; font-family: @mono; font-size: 13.5px; font-weight: 500; color: @text; }
}

.empty { margin: 0; color: @muted; font-size: 13px; }

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: flex-end;
  gap: 10px;
}

.name {
  display: flex;
  align-items: center;
  background: @bg;
  border: 1px solid @border;
  border-radius: 999px;
  padding: 0 16px;
  font-size: 14px;
  color: @muted;

  &:focus-within { border-color: @accent; }

  input {
    width: 150px;
    background: none;
    border: none;
    outline: none;
    color: @text;
    font: inherit;
    padding: 10px 2px 10px 0;
    text-align: right;
  }
}

.download {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 26px;
  background: @accent;
  color: @on-accent;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.12s, transform 0.12s;

  &:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
  &:disabled { opacity: 0.4; cursor: default; }
}
</style>
