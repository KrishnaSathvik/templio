import { useRef, useState } from 'react'
import { FileUp, Sparkles, X, Save } from 'lucide-react'
import { convertImagesToDataUrls } from '../utils/imageProxy'
import {
  validateTitle,
  validateDescription,
  validateHTMLSize,
} from '../utils/validation'
import { isAIAssistConfigured, suggestSnippetMetadata } from '../utils/aiAssist'
import { useToast } from '../contexts/ToastContext'
import { logger } from '../utils/logger'
import { stripDevRuntimeArtifacts } from '../utils/htmlCleanup'
import './AddSnippetForm.css'

const SCREENSHOT_TIMEOUT_MS = 8000
const AUTO_FALLBACK_COLLECTION = 'General'
const AUTO_FALLBACK_TAGS = ['general']
const GENERIC_TITLE_PATTERN =
  /^(index|template|untitled|new\s*file|document|page|html|file\s*\d*|snippet\s*\d*|\d+)$/i

const parseTagsInput = (tagsValue) => {
  return Array.from(
    new Set(
      tagsValue
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
    )
  )
}

const isFullDocument = (html) => /<!doctype html/i.test(html) || /<html[\s\S]*?>/i.test(html)

const normalizeTitleCandidate = (value) => {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

const isGenericTitle = (value) => {
  const normalized = normalizeTitleCandidate(value).toLowerCase()
  return !normalized || GENERIC_TITLE_PATTERN.test(normalized)
}

const wrapHtmlDocument = (html) => {
  if (isFullDocument(html)) return html
  return `<!DOCTYPE html>
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
${html}
</body>
</html>`
}

const cleanupRenderIframes = () => {
  document
    .querySelectorAll('iframe[data-templio-screenshot="true"]')
    .forEach((iframe) => iframe.parentNode?.removeChild(iframe))
}

const waitForIframeReady = async (iframeDoc, timeoutMs) => {
  await new Promise((resolve) => {
    const images = iframeDoc.querySelectorAll('img')
    const stylesheets = iframeDoc.querySelectorAll('link[rel="stylesheet"]')
    const resources = [...images, ...stylesheets]

    if (resources.length === 0) {
      setTimeout(resolve, 250)
      return
    }

    let loaded = 0
    const done = () => {
      loaded += 1
      if (loaded >= resources.length) {
        setTimeout(resolve, 250)
      }
    }

    resources.forEach((resource) => {
      if (resource.tagName === 'IMG' && resource.complete) {
        done()
        return
      }
      if (resource.tagName === 'LINK' && resource.sheet) {
        done()
        return
      }
      resource.addEventListener('load', done, { once: true })
      resource.addEventListener('error', done, { once: true })
    })

    setTimeout(resolve, timeoutMs)
  })
}

const captureScreenshot = async (htmlCode, options) => {
  const { default: html2canvas } = await import('html2canvas')
  cleanupRenderIframes()

  const iframe = document.createElement('iframe')
  iframe.setAttribute('data-templio-screenshot', 'true')
  iframe.style.position = 'absolute'
  iframe.style.left = '-9999px'
  iframe.style.width = '1200px'
  iframe.style.height = '800px'
  iframe.style.border = 'none'
  iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups')
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Could not access iframe for screenshot rendering.')

    iframeDoc.open()
    iframeDoc.write(wrapHtmlDocument(htmlCode))
    iframeDoc.close()

    await waitForIframeReady(iframeDoc, SCREENSHOT_TIMEOUT_MS)

    const canvas = await html2canvas(iframeDoc.body, {
      width: 1200,
      height: 800,
      scale: options.scale,
      useCORS: false,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: SCREENSHOT_TIMEOUT_MS,
    })

    return canvas.toDataURL(options.format, options.quality)
  } finally {
    iframe.parentNode?.removeChild(iframe)
  }
}

const generateScreenshotWithRetry = async (htmlCode) => {
  const attempts = [
    { scale: 0.5, format: 'image/png', quality: 0.85 },
    { scale: 0.4, format: 'image/png', quality: 0.8 },
    { scale: 0.35, format: 'image/jpeg', quality: 0.6 },
  ]

  for (let index = 0; index < attempts.length; index += 1) {
    const config = attempts[index]
    try {
      const screenshot = await Promise.race([
        captureScreenshot(htmlCode, config),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Screenshot generation timed out.')), SCREENSHOT_TIMEOUT_MS)
        ),
      ])

      if (typeof screenshot === 'string' && screenshot.length > 1000000 && index < attempts.length - 1) {
        continue
      }
      return screenshot
    } catch (error) {
      logger.warn(`Screenshot attempt ${index + 1} failed`, error)
      if (index === attempts.length - 1) {
        throw error
      }
    }
  }

  return null
}

function AddSnippetForm({ onSubmit, onBatchSubmit, onCancel }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [collection, setCollection] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [htmlCode, setHtmlCode] = useState('')
  const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isImportingFile, setIsImportingFile] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, fileName: '' })
  const [validationErrors, setValidationErrors] = useState({})
  const aiEnabled = isAIAssistConfigured()

  const clearError = (key) => {
    if (!validationErrors[key]) return
    setValidationErrors((prev) => ({ ...prev, [key]: null }))
  }

  const handleAISuggest = async () => {
    if (!htmlCode.trim()) {
      toast.warning('Add HTML code first, then try AI assist.')
      return
    }

    if (!aiEnabled) {
      toast.error('AI assist is not configured. Set OPENAI_API_KEY for the server environment.')
      return
    }

    setIsGeneratingAI(true)
    try {
      const result = await suggestSnippetMetadata(htmlCode.trim())
      if (!title.trim() && result.title) setTitle(result.title)
      if (!description.trim() && result.description) setDescription(result.description)
      if (!collection.trim() && result.collection) setCollection(result.collection)
      if (!tagsInput.trim() && result.tags.length > 0) setTagsInput(result.tags.join(', '))
      toast.success('AI suggestions generated.')
    } catch (error) {
      logger.error('AI assist failed:', error)
      toast.error(error.message || 'Failed to generate AI suggestions.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const formatFileNameAsTitle = (fileName) => {
    const withoutExtension = fileName.replace(/\.[^/.]+$/, '')
    const normalized = normalizeTitleCandidate(withoutExtension)
    return normalized || 'Imported Template'
  }

  const extractTitleFromHtml = (html) => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const candidates = [
        doc.querySelector('title')?.textContent,
        doc.querySelector('meta[property=\"og:title\"]')?.getAttribute('content'),
        doc.querySelector('meta[name=\"title\"]')?.getAttribute('content'),
        doc.querySelector('h1')?.textContent,
      ]
      for (const candidate of candidates) {
        const normalized = normalizeTitleCandidate(candidate || '')
        if (normalized && !isGenericTitle(normalized)) {
          return normalized
        }
      }
    } catch (error) {
      logger.warn('Failed to extract title from HTML:', error)
    }
    return ''
  }

  const resolveAutoMetadata = async (htmlContent, currentCollection = '', currentTags = []) => {
    let resolvedCollection = currentCollection
    let resolvedTags = [...currentTags]
    let suggestedTitle = ''

    const shouldAutoCategorize = !resolvedCollection || resolvedTags.length === 0
    const autoMetadataPromise =
      aiEnabled && shouldAutoCategorize ? suggestSnippetMetadata(htmlContent) : null

    if (autoMetadataPromise) {
      try {
        const aiResult = await autoMetadataPromise
        if (aiResult.title && !isGenericTitle(aiResult.title)) {
          suggestedTitle = normalizeTitleCandidate(aiResult.title)
        }
        if (!resolvedCollection && aiResult.collection) {
          resolvedCollection = aiResult.collection.slice(0, 80)
        }
        if (resolvedTags.length === 0 && aiResult.tags.length > 0) {
          resolvedTags = parseTagsInput(aiResult.tags.join(', '))
        }
      } catch (error) {
        logger.warn('Auto-category generation failed:', error)
      }
    }

    if (!resolvedCollection) {
      resolvedCollection = AUTO_FALLBACK_COLLECTION
    }
    if (resolvedTags.length === 0) {
      resolvedTags = [...AUTO_FALLBACK_TAGS]
    }

    return { resolvedCollection, resolvedTags, suggestedTitle }
  }

  const buildScreenshot = async (htmlContent) => {
    setIsGeneratingScreenshot(true)
    let screenshot = null
    try {
      let processedHtml = htmlContent
      try {
        processedHtml = await convertImagesToDataUrls(processedHtml)
      } catch (error) {
        logger.warn('Failed to preprocess images for screenshot:', error)
      }

      screenshot = await generateScreenshotWithRetry(processedHtml)
      if (screenshot) {
        logger.log('Screenshot generated successfully, size:', screenshot.length, 'bytes')
      }
    } catch (error) {
      logger.error('Error generating screenshot:', error)
      cleanupRenderIframes()
      toast.warning('Screenshot generation failed. Template will still be saved.', { duration: 3000 })
    } finally {
      setIsGeneratingScreenshot(false)
    }

    return screenshot
  }

  const handleImportFile = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setIsImportingFile(true)
    setImportProgress({ current: 0, total: files.length, fileName: '' })

    const preparedSnippets = []
    const fileErrors = []

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const fileName = file.name || `Imported Template ${index + 1}`
        setImportProgress({ current: index + 1, total: files.length, fileName })

        try {
          const rawFileContent = (await file.text()).trim()
          const { html: cleanedHtml, removedCount } = stripDevRuntimeArtifacts(rawFileContent)
          const fileContent = cleanedHtml.trim()

          if (!fileContent) {
            throw new Error('File is empty')
          }

          const htmlSizeValidation = validateHTMLSize(fileContent)
          if (!htmlSizeValidation.valid) {
            throw new Error(htmlSizeValidation.error)
          }

          const proposedFileTitle = formatFileNameAsTitle(fileName)
          const extractedHtmlTitle = extractTitleFromHtml(fileContent)
          const { resolvedCollection, resolvedTags, suggestedTitle } = await resolveAutoMetadata(
            fileContent
          )

          const bestTitleCandidate =
            suggestedTitle ||
            extractedHtmlTitle ||
            (!isGenericTitle(proposedFileTitle) ? proposedFileTitle : '') ||
            `Imported Template ${index + 1}`

          const titleValidation = validateTitle(bestTitleCandidate)
          const safeTitle = titleValidation.valid ? titleValidation.sanitized : `Imported Template ${index + 1}`
          const screenshot = await buildScreenshot(fileContent)

          if (removedCount > 0) {
            logger.info(`Removed ${removedCount} dev runtime artifact(s) from ${fileName}`)
          }

          preparedSnippets.push({
            title: safeTitle,
            description: `Imported from file: ${fileName}`,
            htmlCode: fileContent,
            collection: resolvedCollection,
            tags: resolvedTags,
            screenshot,
          })
        } catch (error) {
          logger.warn(`Failed to process import file ${fileName}:`, error)
          fileErrors.push({ fileName, error: error.message || 'Failed to process file' })
        }
      }

      if (preparedSnippets.length === 0) {
        toast.error('No valid HTML files were imported.')
        return
      }

      let saveResult = { createdCount: 0, failedCount: 0, failed: [] }
      if (onBatchSubmit) {
        saveResult = await onBatchSubmit(preparedSnippets)
      } else {
        for (const snippet of preparedSnippets) {
          await Promise.resolve(onSubmit(snippet))
        }
        saveResult = { createdCount: preparedSnippets.length, failedCount: 0, failed: [] }
      }

      const preprocessingFailures = fileErrors.length
      const saveFailures = saveResult.failedCount || 0
      const totalFailures = preprocessingFailures + saveFailures

      if (saveResult.createdCount > 0 && totalFailures === 0) {
        toast.success(`Imported ${saveResult.createdCount} HTML file${saveResult.createdCount > 1 ? 's' : ''}.`)
      } else if (saveResult.createdCount > 0) {
        toast.warning(
          `Imported ${saveResult.createdCount} file${saveResult.createdCount > 1 ? 's' : ''}, ${totalFailures} failed.`
        )
      } else {
        toast.error('Import failed for all selected files.')
      }
    } catch (error) {
      logger.error('Failed to import HTML files:', error)
      toast.error(error.message || 'Failed to import HTML files.')
    } finally {
      setIsImportingFile(false)
      setImportProgress({ current: 0, total: 0, fileName: '' })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationErrors({})

    const titleValidation = validateTitle(title)
    if (!titleValidation.valid) {
      setValidationErrors({ title: titleValidation.error })
      toast.error(titleValidation.error, { title: 'Validation Error' })
      return
    }

    const descValidation = validateDescription(description)
    if (!descValidation.valid) {
      setValidationErrors({ description: descValidation.error })
      toast.error(descValidation.error, { title: 'Validation Error' })
      return
    }

    if (!htmlCode.trim()) {
      setValidationErrors({ htmlCode: 'HTML code is required' })
      toast.error('HTML code is required', { title: 'Validation Error' })
      return
    }

    const htmlSizeValidation = validateHTMLSize(htmlCode)
    if (!htmlSizeValidation.valid) {
      setValidationErrors({ htmlCode: htmlSizeValidation.error })
      toast.error(htmlSizeValidation.error, { title: 'Validation Error' })
      return
    }

    const htmlContent = htmlCode.trim()
    const userTags = parseTagsInput(tagsInput)
    const userCollection = collection.trim().slice(0, 80)
    const { resolvedCollection, resolvedTags } = await resolveAutoMetadata(
      htmlContent,
      userCollection,
      userTags
    )
    const shouldAutoCategorize = !userCollection || userTags.length === 0
    const screenshot = await buildScreenshot(htmlContent)

    if (shouldAutoCategorize) {
      toast.info('Collection and tags were auto-assigned from your HTML.', {
        duration: 2500,
      })
    }

    await Promise.resolve(
      onSubmit({
        title: titleValidation.sanitized,
        description: descValidation.sanitized,
        htmlCode: htmlContent,
        collection: resolvedCollection,
        tags: resolvedTags,
        screenshot,
      })
    )

    setTitle('')
    setDescription('')
    setCollection('')
    setTagsInput('')
    setHtmlCode('')
  }

  return (
    <div className="form-overlay">
      <div className="form-container">
        <div className="form-header">
          <h2>Add HTML Template</h2>
          <div className="form-header-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              multiple
              className="hidden-file-input"
              onChange={handleImportFile}
            />
            <button
              type="button"
              className="btn btn-secondary btn-import"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImportingFile || isGeneratingScreenshot || isGeneratingAI}
            >
              {isImportingFile ? (
                <>
                  <span className="spinner"></span>
                  {importProgress.total > 1
                    ? `Importing ${importProgress.current}/${importProgress.total}`
                    : 'Importing...'}
                </>
              ) : (
                <>
                  <FileUp size={16} />
                  Import HTML Files
                </>
              )}
            </button>
            <button className="btn-icon" onClick={onCancel} aria-label="Close add template form">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="snippet-form">
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="title">Title *</label>
              <button
                type="button"
                className="btn btn-secondary btn-ai"
                onClick={handleAISuggest}
                disabled={isGeneratingAI}
              >
                {isGeneratingAI ? (
                  <>
                    <span className="spinner"></span>
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI Suggest
                  </>
                )}
              </button>
            </div>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                clearError('title')
              }}
              placeholder="Enter template title"
              required
              className={validationErrors.title ? 'input-error' : ''}
            />
            {validationErrors.title && <span className="error-message">{validationErrors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                clearError('description')
              }}
              placeholder="Enter description (optional)"
              rows="3"
              className={validationErrors.description ? 'input-error' : ''}
            />
            {validationErrors.description && (
              <span className="error-message">{validationErrors.description}</span>
            )}
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="collection">Collection</label>
              <input
                id="collection"
                type="text"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="Landing Pages"
                maxLength={80}
              />
              <p className="form-help">Optional. If empty, AI auto-assigns on save.</p>
            </div>
            <div className="form-group">
              <label htmlFor="tags">Tags (comma separated)</label>
              <input
                id="tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="hero, navbar, email"
              />
              <p className="form-help">Optional. If empty, AI auto-generates tags on save.</p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="htmlCode">HTML Code *</label>
            <textarea
              id="htmlCode"
              value={htmlCode}
              onChange={(e) => {
                setHtmlCode(e.target.value)
                clearError('htmlCode')
              }}
              placeholder="Paste your HTML code here"
              rows="12"
              required
              className={`code-input ${validationErrors.htmlCode ? 'input-error' : ''}`}
            />
            {validationErrors.htmlCode && <span className="error-message">{validationErrors.htmlCode}</span>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isGeneratingScreenshot || isImportingFile || isGeneratingAI}
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
