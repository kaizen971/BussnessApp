import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/BussnessApp': {
        target: 'https://businessapp.installpostiz.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/BussnessApp/, '/bussnessapp')
      }
    }
  }
})
