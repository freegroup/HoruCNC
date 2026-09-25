<script setup>
import { ref, onMounted } from 'vue'
import { loadExamples } from '@/examples/index.js'
import ChoiceCard from './ChoiceCard.vue'
// The examples (src/examples) as cards — each opens its complete project in the designer.
// They carry their pictures, so they are loaded after the page is up. The grid (.cards) comes
// from the page's site.less.
const examples = ref([])
onMounted(async () => { examples.value = await loadExamples() })
</script>

<template>
  <div class="cards">
    <ChoiceCard
      v-for="ex in examples"
      :key="ex.id"
      :href="`designer.html?example=${ex.id}`"
      :title="ex.title"
      :text="ex.text"
      :picture="ex.project.steps[0]?.values?.image"
      go="Open this example →"
    />
  </div>
</template>
