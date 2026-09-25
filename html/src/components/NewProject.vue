<script setup>
import { computed } from 'vue'
import { usePipelineStore } from '@/stores/pipeline.js'
import { allPlugins } from '@/plugins/index.js'
import { DEFAULT_TEMPLATES } from '@/templates/index.js'
import SiteNav      from './landing/SiteNav.vue'
import ChoiceCard   from './landing/ChoiceCard.vue'
import TemplateArt  from './landing/TemplateArt.vue'
import ExampleCards from './landing/ExampleCards.vue'

/**
 * New project (new.html): continue the stored project, or start from a template or an example.
 * Every choice opens the designer; templates and examples go there as `?template=` / `?example=`.
 */
const store = usePipelineStore()

// The stored pipeline in one line, e.g. "Source Picture → Grayscale → Canny → …"
const stepLine = computed(() => store.steps.map(s => allPlugins.get(s.pluginId)?.label ?? s.pluginId).join(' → '))
</script>

<template>
  <div class="page">
    <SiteNav>
      <a href="index.html">Home</a>
    </SiteNav>

    <main>
      <section class="intro">
        <p class="eyebrow">New project</p>
        <h1 class="section-title">How do you <span>want to start?</span></h1>
      </section>

      <!-- Continue: the project stored in this browser -->
      <section v-if="store.hasProject" class="group">
        <h2 class="group-title">Continue where you left off</h2>
        <a class="resume" href="designer.html">
          <span class="resume-picture">
            <img v-if="store.sourceImage" :src="store.sourceImage" alt="" />
          </span>
          <span class="resume-body">
            <span class="resume-title">{{ store.ui.fileName || 'My project' }}</span>
            <span class="resume-steps">{{ stepLine }}</span>
            <span class="resume-go">Continue →</span>
          </span>
        </a>
      </section>

      <!-- Templates: a new pipeline -->
      <section class="group">
        <h2 class="group-title">Start from a template</h2>
        <p class="group-lead">
          A ready-made pipeline for your kind of picture.
          {{ store.sourceImage ? 'Your current picture comes along.' : 'It starts with a sample picture — take your own any time.' }}
        </p>
        <div class="cards">
          <ChoiceCard
            v-for="t in DEFAULT_TEMPLATES"
            :key="t.id"
            :href="`designer.html?template=${t.id}`"
            :title="t.name"
            :text="t.description"
          >
            <template #art><TemplateArt :id="t.id" /></template>
          </ChoiceCard>
        </div>
      </section>

      <!-- Examples: a finished project, picture included -->
      <section class="group">
        <h2 class="group-title">Start from an example</h2>
        <p class="group-lead">A finished project with its picture — open it and change it step by step.</p>
        <ExampleCards />
        <p v-if="store.hasProject" class="note">
          A template or an example replaces your current pipeline — to keep it, press Save in the designer first.
        </p>
      </section>
    </main>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/site.less';

.intro { padding-bottom: 8px !important; }
.group { padding-top: 40px !important; padding-bottom: 40px !important; }

.group-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.group-lead {
  margin-top: 8px;
  max-width: 620px;
  font-size: 16px;
  color: @muted;
}
.group .cards { margin-top: 24px; }

.resume {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 20px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid @hairline;
  background: @panel;
  color: @text;
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s;

  &:hover { border-color: @accent-line; transform: translateY(-2px); }
  &:hover .resume-go { color: @accent; }

  @media (max-width: 600px) { flex-direction: column; align-items: stretch; }
}
.resume-picture {
  flex: 0 0 220px;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 14px;
  background: #fff;

  img { width: 100%; height: 100%; object-fit: contain; }
}
.resume-body  { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.resume-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.resume-steps { font-size: 14px; color: @muted; }
.resume-go    { margin-top: 8px; font-size: 14px; font-weight: 600; transition: color 0.15s; }
</style>
