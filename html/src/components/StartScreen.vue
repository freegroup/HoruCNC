<script setup>
import { usePipelineStore } from '@/stores/pipeline.js'
import { DEFAULT_TEMPLATES } from '@/templates/index.js'

const store = usePipelineStore()

function startWith(template) {
  store.loadTemplate(template)
}
</script>

<template>
  <div class="start-screen">
    <div class="brand">
      <span class="logo">HoruCNC</span>
      <p class="tagline">Camera to CNC — select a pipeline template to begin</p>
    </div>

    <div class="template-grid">
      <button
        v-for="tpl in DEFAULT_TEMPLATES"
        :key="tpl.id"
        class="tpl-card"
        @click="startWith(tpl)"
      >
        <div class="tpl-name">{{ tpl.name }}</div>
        <div class="tpl-desc">{{ tpl.description }}</div>
        <div class="tpl-steps">
          <template v-for="(block, bi) in tpl.blocks" :key="block.blockId">
            <span v-if="bi > 0" class="tpl-arrow">›</span>
            <span
              v-for="pluginId in block.plugins"
              :key="pluginId"
              class="tpl-chip"
              :class="block.blockId"
            >{{ pluginId }}</span>
          </template>
        </div>
      </button>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

.start-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 48px;
  background: @bg;
  padding: 40px;
}

.brand {
  text-align: center;
}

.logo {
  display: block;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: @accent;
  margin-bottom: 10px;
}

.tagline {
  font-size: 13px;
  color: @muted;
  letter-spacing: 0.04em;
}

.template-grid {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 900px;
}

.tpl-card {
  background: @surface;
  border: 1px solid @border;
  border-radius: 10px;
  padding: 24px 28px;
  width: 280px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: inherit;

  &:hover {
    border-color: @accent;
    background: @surface2;
  }
}

.tpl-name {
  font-size: 15px;
  font-weight: 700;
  color: @text;
  letter-spacing: 0.04em;
}

.tpl-desc {
  font-size: 11px;
  color: #999;
  line-height: 1.5;
}

.tpl-steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}

.tpl-arrow {
  font-size: 10px;
  color: @muted;
  opacity: 0.4;
}

.tpl-chip {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 4px;
  background: @surface2;
  color: @muted;
  border: 1px solid @border;

  &.input  { color: #5ba3f5; border-color: #5ba3f530; background: #5ba3f508; }
  &.image  { color: #9d7fe0; border-color: #9d7fe030; background: #9d7fe008; }
  &.vector { color: #52c97a; border-color: #52c97a30; background: #52c97a08; }
  &.grbl   { color: @accent; border-color: fade(@accent, 20%); background: fade(@accent, 5%); }
}
</style>
