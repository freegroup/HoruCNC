import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { usePipelineStore } from './stores/pipeline.js'
import { DEFAULT_TEMPLATES } from './templates/index.js'
import { loadExample } from './examples/index.js'
import { useProject } from './project/useProject.js'
import './assets/global.less'
import { setFavicon } from './assets/logo.js'

// Designer (designer.html). new.html and the start page open it with `?example=<id>` (a complete
// project with its picture) or `?template=<id>` (a new pipeline — it keeps the current picture,
// an empty project gets the template's start picture). Without either, the stored project is
// restored; without one, the first template is started.
const app   = createApp(App).use(createPinia())
const store = usePipelineStore()

start().then(() => {
  app.mount('#app')
  setFavicon()
})

async function start() {
  const params   = new URLSearchParams(location.search)
  const example  = params.has('example') ? await loadExample(params.get('example')) : null
  const template = DEFAULT_TEMPLATES.find(t => t.id === params.get('template'))
  const project  = useProject()
  if (example)                project.applyProject(example.project)
  else if (template)          await project.startTemplate(template)
  else if (!store.hasProject) await project.startTemplate(DEFAULT_TEMPLATES[0])
  if (params.has('example') || params.has('template'))
    history.replaceState(null, '', location.pathname)  // a reload must not reset the project again
}
