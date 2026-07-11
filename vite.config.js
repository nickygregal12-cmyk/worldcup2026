import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const release = process.env.SENTRY_RELEASE || process.env.COMMIT_REF || ''
const sentryUploadEnabled = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT']
  .every(name => Boolean(process.env[name])) && Boolean(release)

export default defineConfig({
  define: {
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(release),
  },
  // Vitest transforms JSX with esbuild rather than the react plugin's Babel
  // pass, and esbuild's default is the CLASSIC runtime — which is why every
  // rendered component and test carried `import React` purely to put the
  // identifier in scope (each one costing an eslint-disable against the H1
  // ratchet). Pinning the automatic runtime here matches what plugin-react
  // already does for the browser build, so new files need no React import at
  // all. Existing React imports stay valid; they are simply no longer load-bearing.
  esbuild: { jsx: 'automatic' },
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: sentryUploadEnabled ? 'hidden' : false,
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
