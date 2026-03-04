const DEV_RUNTIME_PATTERNS = [
  /\/@vite\/client/i,
  /vite\/dist\/client/i,
  /localhost:5173/i,
  /127\.0\.0\.1:5173/i,
  /\/src\/main\.(js|jsx|ts|tsx)/i,
]

const INLINE_DEV_PATTERNS = [
  /import\.meta\.hot/i,
  /__vite_plugin_react_preamble_installed__/i,
  /new\s+WebSocket\s*\(/i,
]

const matchesAny = (value, patterns) => patterns.some((pattern) => pattern.test(value))

export function stripDevRuntimeArtifacts(html) {
  if (!html || typeof html !== 'string') return html
  if (typeof window === 'undefined') return html

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    let removedCount = 0

    doc.querySelectorAll('script').forEach((script) => {
      const src = script.getAttribute('src') || ''
      const inline = script.textContent || ''

      if (
        (src && matchesAny(src, DEV_RUNTIME_PATTERNS)) ||
        (!src && matchesAny(inline, INLINE_DEV_PATTERNS))
      ) {
        script.remove()
        removedCount += 1
      }
    })

    doc.querySelectorAll('link[rel="modulepreload"], link[rel="preload"][as="script"]').forEach((link) => {
      const href = link.getAttribute('href') || ''
      if (href && matchesAny(href, DEV_RUNTIME_PATTERNS)) {
        link.remove()
        removedCount += 1
      }
    })

    return {
      html: doc.documentElement?.outerHTML || html,
      removedCount,
    }
  } catch {
    return { html, removedCount: 0 }
  }
}

