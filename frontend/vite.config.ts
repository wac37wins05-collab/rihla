import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// API target: backend RIHLA FastAPI port 8000
const API_TARGET = process.env.VITE_API_URL
  || (process.env.DOCKER ? 'http://backend:8000' : 'http://127.0.0.1:8000')

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ disable: true }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/socket.io': { target: API_TARGET, changeOrigin: true, ws: true },
      '/billing': {
        target: process.env.VITE_BILLING_URL
          || (process.env.DOCKER ? 'http://billing-engine:3100' : 'http://127.0.0.1:3100'),
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/billing/, ''),
      },
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    // Minification & optimization
    minify: 'esbuild',
    cssMinify: true,
  },
})
