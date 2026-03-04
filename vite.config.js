import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateAiSuggestion } from './server/aiSuggest.js'

const readRequestBody = (req) =>
  new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'))
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

const devAiAssistPlugin = {
  name: 'templio-dev-ai-assist',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith('/api/ai-suggest')) {
        return next()
      }

      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      try {
        const raw = await readRequestBody(req)
        const body = raw ? JSON.parse(raw) : {}
        const htmlCode = typeof body.htmlCode === 'string' ? body.htmlCode : ''

        const suggestion = await generateAiSuggestion({
          htmlCode,
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
        })

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(suggestion))
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message || 'AI assist failed' }))
      }
    })
  },
}

export default defineConfig({
  plugins: [react(), devAiAssistPlugin],
  optimizeDeps: {
    include: ['html2canvas'],
    exclude: [],
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          editor: ['react-simple-code-editor', 'prismjs'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})

