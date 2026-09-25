import { defineStore } from 'pinia'
import { ref, computed, watch, toRaw } from 'vue'
import { allPlugins, BLOCK_MAP } from '@/plugins/index.js'
import { DEFAULT_TEMPLATES }    from '@/templates/index.js'
import { UPLOAD }               from '@/plugins/input/source.js'
import { storage }              from './storage.js'

const STORAGE_KEY = 'horucnc_pipeline_v3'
const SAVE_DELAY  = 300     // ms — the state carries the picture, so a slider drag must not save every frame

// Plugins renamed since a project could have been saved: old id → new id
const RENAMED = { camera: 'source' }

/** Build default param values for a plugin. */
function defaultValues(pluginId) {
  const plugin = allPlugins.get(pluginId)
  if (!plugin) return {}
  const values = {}
  for (const p of plugin.params ?? []) {
    // Object defaults (e.g. a size) are copied — steps must not share one object
    if (p.key && 'default' in p) values[p.key] = p.default && typeof p.default === 'object' ? structuredClone(p.default) : p.default
  }
  return values
}

/** Create a unique instanceId within the current step list. */
function makeInstanceId(pluginId, steps) {
  let n = 1
  while (steps.some(s => s.instanceId === `${pluginId}_${n}`)) n++
  return `${pluginId}_${n}`
}

/** Expand a block-based template (see templates/defineTemplate.js) into steps with instance IDs. */
function templateToSteps(template) {
  const steps = []
  for (const block of template.blocks) {
    for (const pluginId of block.plugins) {
      const instanceId = makeInstanceId(pluginId, steps)
      steps.push({
        instanceId,
        pluginId,
        blockId: block.blockId,
        values:  { ...defaultValues(pluginId), ...template.values?.[pluginId] },
      })
    }
  }
  return steps
}

/**
 * View state that is not part of the pipeline itself but should survive a reload, like in
 * PatternMaster: the chosen view per step, the scroll position, the export file name.
 */
function sanitizeUi(ui) {
  const u = ui && typeof ui === 'object' ? ui : {}
  return {
    views:     u.views && typeof u.views === 'object' ? u.views : {},
    split:     Number.isFinite(u.split) ? Math.min(1, Math.max(0, u.split)) : 0.5,   // shared before/after divider
    scrollTop: Number.isFinite(u.scrollTop) ? u.scrollTop : 0,
    fileName:  typeof u.fileName === 'string' ? u.fileName : 'horucnc',
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Validate that it has the v2 format (instanceId on each step)
    if (!Array.isArray(data?.steps) || !data.steps[0]?.instanceId) return null
    // Reject v2 pipelines that still reference the removed 'input' block
    if (data.steps.some(s => s.blockId === 'input')) return null
    const renamed = data.steps.some(s => s.pluginId in RENAMED)
    data.steps = sanitizeSteps(data.steps)
    data.ui = sanitizeUi(data.ui)
    // An older format is written back right away — the legacy snapshot is gone after this
    data.migrated = adoptLegacySnapshot(data.steps) || renamed
    return data
  } catch {}
  return null
}

/** Steps from storage or a project file: works with today's plugins and their params. */
function sanitizeSteps(steps) {
  for (const step of steps) step.pluginId = RENAMED[step.pluginId] ?? step.pluginId
  // A plugin may have been removed since — drop its steps
  const kept = steps.filter(s => allPlugins.has(s.pluginId))
  // Params added since the project was saved get their defaults
  for (const step of kept) step.values = { ...defaultValues(step.pluginId), ...step.values }
  return kept
}

// The picture used to be stored on its own, next to the pipeline — move it into the source step
function adoptLegacySnapshot(steps) {
  const legacy = storage.get('snapshot')
  if (typeof legacy !== 'string') return false
  if (steps[0]?.pluginId === 'source' && !steps[0].values.image) steps[0].values.image = legacy
  storage.remove('snapshot')
  return true
}

const BLOCK_ORDER = ['image', 'vector', 'grbl']

export const usePipelineStore = defineStore('pipeline', () => {
  const saved = loadFromStorage()

  // Empty steps = no project → show StartScreen
  const steps        = ref(saved?.steps ?? [])
  const activeIndex  = ref(saved?.activeIndex ?? 0)
  const ui           = ref(saved?.ui ?? sanitizeUi())

  const activeStep   = computed(() => steps.value[activeIndex.value] ?? steps.value[0])
  const activePlugin = computed(() => allPlugins.get(activeStep.value?.pluginId))

  // The picture the pipeline works on is a value of its first step, the source
  const sourceImage  = computed(() => steps.value[0]?.values?.image ?? null)
  function setSourceImage(url) {
    if (steps.value[0]) steps.value[0].values.image = url || null
  }

  /**
   * Sent to the worker as `pipelineParams`. Strips Vue proxies — per value, so an object value
   * (a size) can be posted too, while reading through the proxy keeps every value tracked.
   */
  const pipelineParams = computed(() => {
    const map = {}
    for (const step of steps.value)
      map[step.instanceId] = Object.fromEntries(Object.entries(step.values).map(([k, v]) => [k, toRaw(v)]))
    return map
  })

  /** Sent to worker on configure — minimal step descriptors. */
  const workerSteps = computed(() =>
    steps.value.map(s => ({ instanceId: s.instanceId, pluginId: s.pluginId }))
  )

  const hasProject = computed(() => steps.value.length > 0)

  // ── Mandatory-first helpers ──────────────────────────────────────────────────
  /** True if this step is the locked first step of its block. */
  function isMandatoryFirst(instanceId) {
    const step  = steps.value.find(s => s.instanceId === instanceId)
    if (!step) return false
    const block = BLOCK_MAP[step.blockId]
    if (!block?.mandatoryFirst) return false
    return steps.value.find(s => s.blockId === step.blockId)?.instanceId === instanceId
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function setActive(index) {
    activeIndex.value = Math.max(0, Math.min(index, steps.value.length - 1))
  }

  // ── Collapse state (persisted with the steps) ───────────────────────────────
  function toggleCollapsed(instanceId) {
    const step = steps.value.find(s => s.instanceId === instanceId)
    if (step) step.collapsed = !step.collapsed
  }

  function updateParam(key, value) {
    steps.value[activeIndex.value].values[key] = value
  }

  function updateStepParam(instanceId, key, value) {
    const step = steps.value.find(s => s.instanceId === instanceId)
    if (step) step.values[key] = value
  }

  // ── Step management ──────────────────────────────────────────────────────────
  function addStep(blockId, pluginId) {
    const blockIdx = BLOCK_ORDER.indexOf(blockId)

    // Find insertion point: after the last step in this block
    let insertAt = -1
    for (let i = 0; i < steps.value.length; i++) {
      if (steps.value[i].blockId === blockId) insertAt = i
    }

    if (insertAt >= 0) {
      insertAt++ // insert after last step in block
    } else {
      // Block has no steps yet — insert before first step of any later block
      insertAt = steps.value.length
      for (let bi = blockIdx + 1; bi < BLOCK_ORDER.length; bi++) {
        const nextFirst = steps.value.findIndex(s => s.blockId === BLOCK_ORDER[bi])
        if (nextFirst >= 0) { insertAt = nextFirst; break }
      }
    }

    const instanceId = makeInstanceId(pluginId, steps.value)
    steps.value.splice(insertAt, 0, {
      instanceId,
      pluginId,
      blockId,
      values: defaultValues(pluginId),
    })
    activeIndex.value = insertAt
  }

  function addStepBefore(beforeInstanceId, pluginId) {
    const idx = steps.value.findIndex(s => s.instanceId === beforeInstanceId)
    if (idx < 0) return
    const blockId = steps.value[idx].blockId
    if (BLOCK_MAP[blockId]?.fixed) return
    // Don't allow inserting before the mandatory first step
    if (isMandatoryFirst(beforeInstanceId)) return
    const instanceId = makeInstanceId(pluginId, steps.value)
    steps.value.splice(idx, 0, {
      instanceId,
      pluginId,
      blockId,
      values: defaultValues(pluginId),
    })
    activeIndex.value = idx
  }

  function removeStep(instanceId) {
    const idx = steps.value.findIndex(s => s.instanceId === instanceId)
    if (idx < 0) return
    const block = BLOCK_MAP[steps.value[idx].blockId]
    if (block?.fixed) return
    if (isMandatoryFirst(instanceId)) return
    steps.value.splice(idx, 1)
    activeIndex.value = Math.min(activeIndex.value, Math.max(0, steps.value.length - 1))
  }

  /** Swap the mandatory-first step for a different plugin from the whitelist. */
  function replaceStep(instanceId, newPluginId) {
    const idx = steps.value.findIndex(s => s.instanceId === instanceId)
    if (idx < 0) return
    const blockId      = steps.value[idx].blockId
    const newInstanceId = makeInstanceId(newPluginId, steps.value)
    steps.value.splice(idx, 1, {
      instanceId: newInstanceId,
      pluginId:   newPluginId,
      blockId,
      values:     defaultValues(newPluginId),
    })
    activeIndex.value = idx
  }

  function moveStep(instanceId, direction) {
    const idx = steps.value.findIndex(s => s.instanceId === instanceId)
    if (idx < 0) return
    const step   = steps.value[idx]
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= steps.value.length) return
    if (steps.value[newIdx].blockId !== step.blockId) return
    steps.value.splice(idx, 1)
    steps.value.splice(newIdx, 0, step)
    activeIndex.value = newIdx
  }

  /**
   * Drag & drop: put a step before or after another step of the same block.
   * The block's mandatory first step (e.g. the camera) always stays first.
   */
  function moveStepTo(instanceId, targetInstanceId, after) {
    if (instanceId === targetInstanceId) return
    const step   = steps.value.find(s => s.instanceId === instanceId)
    const target = steps.value.find(s => s.instanceId === targetInstanceId)
    if (!step || !target || step.blockId !== target.blockId) return
    if (BLOCK_MAP[step.blockId]?.fixed || isMandatoryFirst(instanceId)) return
    if (isMandatoryFirst(targetInstanceId)) after = true
    steps.value.splice(steps.value.indexOf(step), 1)
    const at = steps.value.indexOf(target) + (after ? 1 : 0)
    steps.value.splice(at, 0, step)
    activeIndex.value = at
  }

  // ── Templates ────────────────────────────────────────────────────────────────
  /**
   * A new project from a template. The picture of the current project comes along (with its
   * source settings); only an empty project gets `startPicture` — then from "Upload image".
   */
  function loadTemplate(template, startPicture = null) {
    const source = steps.value[0]?.pluginId === 'source' ? steps.value[0].values : null
    const next   = templateToSteps(template)
    if (source?.image)     Object.assign(next[0].values, source)
    else if (startPicture) Object.assign(next[0].values, { image: startPicture, deviceId: UPLOAD })
    steps.value       = next
    activeIndex.value = 0
    ui.value          = { ...sanitizeUi(), fileName: ui.value.fileName }
  }

  /** A project file: its picture comes with it, so the source becomes "Upload image". */
  function loadProject(project) {
    const next = sanitizeSteps(project.steps)
    if (next[0]?.pluginId !== 'source' || next.some(s => !BLOCK_MAP[s.blockId]))
      throw new Error('This project uses steps this version of HoruCNC does not know.')
    next[0].values.deviceId = UPLOAD
    steps.value       = next
    activeIndex.value = 0
    ui.value          = sanitizeUi(project.ui)
  }

  // ── Persistence ──────────────────────────────────────────────────────────────
  // One serialisable state (steps + ui, the picture included) — every change is saved shortly
  // after it happens, a reload restores all of it
  let saveTimer = 0
  watch([steps, activeIndex, ui], () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, SAVE_DELAY)
  }, { deep: true })
  addEventListener('pagehide', () => { if (saveTimer) save() })   // don't lose the last change
  if (saved?.migrated) save()

  function save() {
    saveTimer = 0
    if (steps.value.length === 0) return  // don't persist empty project
    const state = { steps: steps.value, activeIndex: activeIndex.value, ui: ui.value }
    if (write(state)) return
    // Storage full: keep at least the pipeline, a reload then just asks for a new picture
    write({ ...state, steps: steps.value.map((s, i) => i ? s : { ...s, values: { ...s.values, image: null } }) })
  }

  function write(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true }
    catch { return false }
  }

  return {
    steps,
    activeIndex,
    ui,
    activeStep,
    activePlugin,
    sourceImage,
    setSourceImage,
    pipelineParams,
    workerSteps,
    hasProject,
    setActive,
    updateParam,
    updateStepParam,
    toggleCollapsed,
    isMandatoryFirst,
    addStep,
    addStepBefore,
    removeStep,
    replaceStep,
    moveStep,
    moveStepTo,
    loadTemplate,
    loadProject,
  }
})
