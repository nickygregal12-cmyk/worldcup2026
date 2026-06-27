import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('xlsx') || id.includes('html2canvas')) return undefined
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react'
          if (id.includes('date-fns')) return 'vendor-date'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
