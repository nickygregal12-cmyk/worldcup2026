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
  test: {
    // The default stays `node`, which is what every suite before the jsdom stage
    // already ran under — pure models plus renderToStaticMarkup, neither of which
    // needs a DOM. Making the default explicit is the point: a DOM is OPT-IN, per
    // file, with a `// @vitest-environment jsdom` docblock. Files that ask for it
    // (the DP-PRIMITIVES interaction tests) can dispatch real key, pointer and
    // focus events; the rest keep their existing semantics and pay none of jsdom's
    // per-file construction cost.
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
  },
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
    // Codespaces cannot reach a container port from the browser: 127.0.0.1 there
    // is the developer's own laptop. Proxying the local Supabase stack under the
    // dev server's own origin keeps it same-origin, so no port needs opening.
    // Inert unless VITE_SUPABASE_URL points at this path.
    proxy: {
      '/local-supabase': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        ws: true,
        rewrite: path => path.replace(/^\/local-supabase/, ''),
      },
    },
  },
})
