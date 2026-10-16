import { defineConfig } from 'vite'

export default defineConfig({
  server: { open: true, host: true },
  build: { chunkSizeWarningLimit: 1200 },
})
