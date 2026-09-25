import { createApp } from 'vue'
import { createPinia } from 'pinia'
import StartScreen from './components/StartScreen.vue'
import './assets/global.less'
import { setFavicon } from './assets/logo.js'

// Start page (index.html).
createApp(StartScreen).use(createPinia()).mount('#app')
setFavicon()
