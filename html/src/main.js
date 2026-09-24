import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { usePipelineStore } from './stores/pipeline.js'
import { DEFAULT_TEMPLATES } from './templates/index.js'
import { sharedCam } from './plugins/grbl/preview/viewCam.js'
import './assets/global.less'
import { setFavicon } from './assets/logo.js'

// Designer (designer.html). `?template=<id>` comes from the start page: start fresh with it.
// Without a stored project the first template is loaded, so the designer is never empty.
const app = createApp(App).use(createPinia())
const store = usePipelineStore()

const params   = new URLSearchParams(location.search)
const template = DEFAULT_TEMPLATES.find(t => t.id === params.get('template'))
if (template) {
  store.loadTemplate(template)
  sharedCam.framedFor = ''                              // new pipeline → fit the 3D views anew
  history.replaceState(null, '', location.pathname)   // a reload must not reset the project again
} else if (!store.hasProject) {
  store.loadTemplate(DEFAULT_TEMPLATES[0])
}

app.mount('#app')
setFavicon()
