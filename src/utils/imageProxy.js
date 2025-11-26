import { logger } from './logger'

/**
 * Converts external images to data URLs to avoid CORS issues
 */
export async function convertImagesToDataUrls(htmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')
  const images = doc.querySelectorAll('img[src]')

  const imagePromises = Array.from(images).map(async (img) => {
    const src = img.getAttribute('src')
    if (!src) return

    // Skip if already a data URL
    if (src.startsWith('data:')) return

    // Skip if same origin
    try {
      const url = new URL(src, window.location.href)
      if (url.origin === window.location.origin) return
    } catch (e) {
      // Invalid URL, skip
      return
    }

    try {
      // First, try to fetch directly (some servers allow CORS)
      let response
      try {
        response = await fetch(src, { mode: 'cors' })
        if (!response.ok) throw new Error('Response not ok')
      } catch (directError) {
        // If direct fetch fails (CORS or other error), try CORS proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        try {
          response = await fetch(proxyUrl, {
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeoutId)
        }
      }
      
      if (response.ok) {
        const blob = await response.blob()
        
        // Verify it's an image
        if (!blob.type.startsWith('image/')) {
          logger.warn(`URL ${src} is not an image`)
          return
        }
        
        const reader = new FileReader()
        
        return new Promise((resolve) => {
          reader.onloadend = () => {
            img.setAttribute('src', reader.result)
            resolve()
          }
          reader.onerror = () => {
            logger.warn(`Failed to convert image ${src} to data URL`)
            resolve() // Continue even if this image fails
          }
          reader.readAsDataURL(blob)
        })
      }
    } catch (error) {
      logger.warn(`Failed to load image ${src}:`, error.message)
      // Keep original src - html2canvas might still be able to render it
      // or it will show as broken, which is acceptable
    }
  })

  await Promise.allSettled(imagePromises)
  return doc.documentElement.outerHTML
}

/**
 * Alternative: Use a simpler approach with allowTaint
 */
export function prepareHtmlForScreenshot(htmlString) {
  // This function can be used to preprocess HTML if needed
  return htmlString
}

