import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expone el servidor en la IP local para que las PDAs puedan conectarse
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Apunta al backend de Docker
        changeOrigin: true,
        xfwd: true, // Añade la IP original (PDA) en la cabecera X-Forwarded-For
      }
    }
  }
})
