import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { allPlugins, BLOCK_MAP } from '@/plugins/index.js'
import { DEFAULT_TEMPLATES }    from '@/templates/index.js'

const STORAGE_KEY = 'horucnc_pipeline_v3'

/** Build default param values for a plugin. */
function defaultValues(pluginId) {
  const plugin = allPlugins.get(pluginId)
  if (!plugin) return {}
  const values = {}
  for (const p of plugin.params ?? []) {
    if (p.key && 'default' in p) values[p.key] = p.default
  }
  return values
}

/** Create a unique instanceId within the current step list. */
function makeInstanceId(pluginId, steps) {
  let n = 1
  while (steps.some(s => s.instanceId === `${pluginId}_${n}`)) n++
  return `${pluginId}_${n}`
}

/**
 * Expand a block-based template into a flat step array with instance IDs.
 * @param {import('@/templates/types').PipelineTemplate} template
 */
function templateToSteps(template) {
  const steps = []
  for (const block of template.blocks) {
    for (const pluginId of block.plugins) {
      const instanceId = makeInstanceId(pluginId, steps)
      steps.push({
        instanceId,
        pluginId,
        blockId: block.blockId,
        values:  defaultValues(pluginId),
      })
    }
  }
  return steps
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
    return data
  } catch {}
  return null
}

const BLOCK_ORDER = ['input', 'image', 'vector', 'grbl']

export const usePipelineStore = defineStore('pipeline', () => {
  const saved = loadFromStorage()

  // Empty steps = no project → show StartScreen
  const steps        = ref(saved?.steps ?? [])
  const activeIndex  = ref(saved?.activeIndex ?? 0)

  const activeStep   = computed(() => steps.value[activeIndex.value] ?? steps.value[0])
  const activePlugin = computed(() => allPlugins.get(activeStep.value?.pluginId))

  /** Sent to the worker as `pipelineParams`. Strips Vue proxies. */
  const pipelineParams = computed(() => {
    const map = {}
    for (const step of steps.value) map[step.instanceId] = { ...step.values }
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

  // ── Templates ────────────────────────────────────────────────────────────────
  function loadTemplate(template) {
    steps.value       = templateToSteps(template)
    activeIndex.value = 0
  }

  // ── Persistence ──────────────────────────────────────────────────────────────
  watch([steps, activeIndex], () => {
    if (steps.value.length === 0) return  // don't persist empty project
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        steps:       steps.value,
        activeIndex: activeIndex.value,
      }))
    } catch {}
  }, { deep: true })

  return {
    steps,
    activeIndex,
    activeStep,
    activePlugin,
    pipelineParams,
    workerSteps,
    hasProject,
    setActive,
    updateParam,
    updateStepParam,
    isMandatoryFirst,
    addStep,
    addStepBefore,
    removeStep,
    replaceStep,
    moveStep,
    loadTemplate,
  }
})
