import { createApp } from 'vue'
import { createPinia } from 'pinia'
import NewProject from './components/NewProject.vue'
import './assets/global.less'
import { setFavicon } from './assets/logo.js'

// New project (new.html): continue the stored project, or pick a template or an example.
createApp(NewProject).use(createPinia()).mount('#app')
setFavicon()
