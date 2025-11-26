import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['html2canvas'],
    exclude: [],
  },
  build: {
    // Optimize for production
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    rollupOptions: {
      output: {
        // Optimize chunk splitting
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'editor': ['react-simple-code-editor', 'prismjs'],
        },
      },
    },
    // Increase chunk size warning limit (html2canvas is large)
    chunkSizeWarningLimit: 1000,
  },
})

