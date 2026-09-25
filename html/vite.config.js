import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    // Pages: start page, new project (continue / template / example) and the designer
    rollupOptions: {
      input: {
        index:    fileURLToPath(new URL('./index.html', import.meta.url)),
        new:      fileURLToPath(new URL('./new.html', import.meta.url)),
        designer: fileURLToPath(new URL('./designer.html', import.meta.url)),
      },
    },
  },
  base: './',
  worker: {
    format: 'es',
  },
})
