import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { convertImagesToDataUrls } from '../utils/imageProxy'
import { validateTitle, validateDescription, validateHTMLSize, validateAndSanitizeHTML } from '../utils/validation'
import { useToast } from '../contexts/ToastContext'
import { logger } from '../utils/logger'
import './AddSnippetForm.css'

function AddSnippetForm({ onSubmit, onCancel }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [htmlCode, setHtmlCode] = useState('')
  const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationErrors({})

    // Validate title
    const titleValidation = validateTitle(title)
    if (!titleValidation.valid) {
      setValidationErrors({ title: titleValidation.error })
      toast.error(titleValidation.error, { title: 'Validation Error' })
      return
    }

    // Validate description
    const descValidation = validateDescription(description)
    if (!descValidation.valid) {
      setValidationErrors({ description: descValidation.error })
      toast.error(descValidation.error, { title: 'Validation Error' })
      return
    }

    // Validate HTML code
    if (!htmlCode.trim()) {
      setValidationErrors({ htmlCode: 'HTML code is required' })
      toast.error('HTML code is required', { title: 'Validation Error' })
      return
    }

    // Validate HTML size (but don't sanitize on save - only sanitize on preview for security)
    const htmlSizeValidation = validateHTMLSize(htmlCode)
    if (!htmlSizeValidation.valid) {
      setValidationErrors({ htmlCode: htmlSizeValidation.error })
      toast.error(htmlSizeValidation.error, { title: 'Validation Error' })
      return
    }

    setIsGeneratingScreenshot(true)
    let screenshot = null

    try {
      // Generate screenshot
      const { default: html2canvas } = await import('html2canvas')
      
      // Process HTML for screenshot generation
      // Don't sanitize - use original HTML to preserve all functionality
      let processedHtml = htmlCode.trim()
      
      // Convert external images to data URLs to avoid CORS issues
      try {
        processedHtml = await convertImagesToDataUrls(processedHtml)
      } catch (error) {
        logger.warn('Failed to process images, using original HTML:', error)
        // Continue with original HTML
      }
      
      // Detect if this is already a full HTML document
      const hasFullDocument =
        /<!doctype html/i.test(processedHtml) || /<html[\s\S]*?>/i.test(processedHtml)

      if (!hasFullDocument) {
        // Wrap partial HTML inside a minimal shell
        processedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Screenshot</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; min-height: 100vh; }
  </style>
</head>
<body>
${processedHtml}
</body>
</html>`
      }
      
      // Create a temporary iframe to render the HTML
      const iframe = document.createElement('iframe')
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      iframe.style.width = '1200px'
      iframe.style.height = '800px'
      iframe.style.border = 'none'
      // Add sandbox attributes to allow html2canvas to work
      iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups')
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      if (!iframeDoc) {
        throw new Error('Could not access iframe document')
      }
      
      iframeDoc.open()
      iframeDoc.write(processedHtml)
      iframeDoc.close()

      // Wait for images, stylesheets, and content to load
      await new Promise((resolve) => {
        const checkReady = () => {
          const images = iframeDoc.querySelectorAll('img')
          const stylesheets = iframeDoc.querySelectorAll('link[rel="stylesheet"]')
          let loadedCount = 0
          const totalResources = images.length + stylesheets.length

          if (totalResources === 0) {
            setTimeout(resolve, 500) // Give time for rendering even if no external resources
            return
          }

          const resourceLoaded = () => {
            loadedCount++
            if (loadedCount === totalResources) {
              setTimeout(resolve, 300) // Small delay to ensure rendering
            }
          }

          images.forEach((img) => {
            if (img.complete) {
              resourceLoaded()
            } else {
              img.onload = resourceLoaded
              img.onerror = resourceLoaded // Count as loaded even if error
            }
          })

          stylesheets.forEach((link) => {
            if (link.sheet) { // Check if stylesheet is loaded
              resourceLoaded()
            } else {
              link.onload = resourceLoaded
              link.onerror = resourceLoaded // Count as loaded even if error
            }
          })

          if (loadedCount === totalResources) {
            setTimeout(resolve, 300)
          } else {
            // Timeout after 5 seconds if some resources are still loading
            setTimeout(resolve, 5000)
          }
        }

        iframe.onload = () => {
          setTimeout(checkReady, 200) // Initial check after iframe loads
        }
        setTimeout(checkReady, 1000) // Fallback check if iframe.onload doesn't fire
      })

      const canvas = await html2canvas(iframeDoc.body, {
        width: 1200,
        height: 800,
        scale: 0.5,
        useCORS: false, // Set to false since we're using data URLs
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
      })

      screenshot = canvas.toDataURL('image/png', 0.8) // Use 0.8 quality to reduce size
      
      // Check if screenshot is too large (Supabase text fields have limits)
      // Most databases have a limit around 1MB for text fields
      if (screenshot.length > 1000000) {
        logger.warn('Screenshot too large, reducing quality...')
        screenshot = canvas.toDataURL('image/jpeg', 0.6) // Try JPEG with lower quality
      }
      
      logger.log('Screenshot generated successfully, size:', screenshot.length, 'bytes')
      
      // Clean up iframe
      try {
        if (iframe.parentNode) {
          document.body.removeChild(iframe)
        }
      } catch (cleanupError) {
        logger.warn('Error cleaning up iframe:', cleanupError)
      }
    } catch (error) {
      logger.error('Error generating screenshot:', error)
      // Clean up iframe even on error
      try {
        const iframe = document.querySelector('iframe[style*="-9999px"]')
        if (iframe && iframe.parentNode) {
          document.body.removeChild(iframe)
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      // Continue without screenshot - snippet will still be saved
      toast.warning('Screenshot generation failed, but template will still be saved.', {
        duration: 3000,
      })
    }

    setIsGeneratingScreenshot(false)

    // Log if screenshot was generated
    if (!screenshot) {
      logger.warn('No screenshot generated, saving template without screenshot')
    }

    onSubmit({
      title: titleValidation.sanitized,
      description: descValidation.sanitized,
      // Save original HTML, not sanitized (sanitize only on preview for security)
      htmlCode: htmlCode.trim(),
      screenshot,
    })

    // Reset form
    setTitle('')
    setDescription('')
    setHtmlCode('')
  }

  return (
    <div className="form-overlay">
      <div className="form-container">
        <div className="form-header">
          <h2>Add HTML Template</h2>
          <button className="btn-icon" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="snippet-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (validationErrors.title) {
                  setValidationErrors({ ...validationErrors, title: null })
                }
              }}
              placeholder="Enter template title"
              required
              className={validationErrors.title ? 'input-error' : ''}
            />
            {validationErrors.title && (
              <span className="error-message">{validationErrors.title}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (validationErrors.description) {
                  setValidationErrors({ ...validationErrors, description: null })
                }
              }}
              placeholder="Enter description (optional)"
              rows="3"
              className={validationErrors.description ? 'input-error' : ''}
            />
            {validationErrors.description && (
              <span className="error-message">{validationErrors.description}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="htmlCode">HTML Code *</label>
            <textarea
              id="htmlCode"
              value={htmlCode}
              onChange={(e) => {
                setHtmlCode(e.target.value)
                if (validationErrors.htmlCode) {
                  setValidationErrors({ ...validationErrors, htmlCode: null })
                }
              }}
              placeholder="Paste your HTML code here"
              rows="12"
              required
              className={`code-input ${validationErrors.htmlCode ? 'input-error' : ''}`}
            />
            {validationErrors.htmlCode && (
              <span className="error-message">{validationErrors.htmlCode}</span>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isGeneratingScreenshot}
            >
              {isGeneratingScreenshot ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddSnippetForm

