import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expone en red local y Docker
    port: 5175,
    watch: {
      usePolling: true, // Compatibilidad con volúmenes Docker en Windows
    },
    proxy: {
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
        xfwd: true,
      },
      '/admin': {
        target: 'http://backend:5000',
        changeOrigin: true,
        xfwd: true,
      }
    }
  }
})
