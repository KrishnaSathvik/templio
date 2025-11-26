import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Trash2, Copy, Check, Code, X, Edit2, Eye } from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-javascript'
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'
import 'prismjs/plugins/line-numbers/prism-line-numbers'
import { logger } from '../utils/logger'
import { validateAndSanitizeHTML } from '../utils/validation'
import './SnippetDetail.css'

function SnippetDetail({ snippet, onBack, onDelete, onUpdate }) {
  // Restore view from URL or default to 'preview'
  const getInitialView = () => {
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    // Only use 'code' if explicitly set, otherwise default to 'preview'
    return viewParam === 'code' ? 'code' : 'preview'
  }

  const [view, setView] = useState(getInitialView())
  const [copied, setCopied] = useState(false)
  
  // Reset to preview when snippet changes (user clicked a different template)
  // This ensures clicking a template always shows preview first
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    // Only reset to preview if view param is not explicitly set to 'code'
    // This allows the URL to control the view when navigating
    if (viewParam !== 'code') {
      setView('preview')
    }
  }, [snippet.id])
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(snippet.title)
  const [iframeLoading, setIframeLoading] = useState(true)
  const previewRef = useRef(null)
  const iframeRef = useRef(null)
  const titleInputRef = useRef(null)
  const gutterRef = useRef(null)
  const editorWrapperRef = useRef(null)

  // Update URL when view changes
  const updateView = (newView) => {
    setView(newView)
    const url = new URL(window.location)
    url.searchParams.set('view', newView)
    window.history.replaceState({}, '', url)
  }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !snippet.htmlCode || view !== 'preview') return

    setIframeLoading(true)

    let html = snippet.htmlCode.trim()

    // Note: HTML is saved as-is (not sanitized) to preserve all functionality
    // Sanitization can be added here for preview if needed, but it may break some templates
    // For now, we use the original HTML to ensure compatibility with all templates

    // Detect if this is already a full HTML document
    const hasFullDocument =
      /<!doctype html/i.test(html) || /<html[\s\S]*?>/i.test(html)

    if (!hasFullDocument) {
      // Wrap partial HTML inside a minimal shell
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
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

    const handleLoad = () => {
      // Simple delay to ensure content is rendered
      setTimeout(() => {
        setIframeLoading(false)
      }, 100)
    }

    // Use srcdoc for same-origin content
    iframe.srcdoc = html
    
    // Wait for iframe load event
    iframe.addEventListener('load', handleLoad, { once: true })
    
    // Fallback timeout in case load event doesn't fire
    const timeout = setTimeout(() => {
      setIframeLoading(false)
    }, 1000)
    
    return () => {
      iframe.removeEventListener('load', handleLoad)
      clearTimeout(timeout)
    }
  }, [snippet.htmlCode, view])

  useEffect(() => {
    setEditedTitle(snippet.title)
  }, [snippet.title])

  // Highlight function for editor
  const highlightCode = (code) => {
    return Prism.highlight(code, Prism.languages.markup, 'markup')
  }

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  // Sync gutter scroll with editor scroll
  useEffect(() => {
    if (view !== 'code') return // Only sync in code view
    
    const editorWrapper = editorWrapperRef.current
    const gutter = gutterRef.current
    if (!editorWrapper || !gutter) return

    const codeContent = editorWrapper.querySelector('.code-editor-content')
    if (!codeContent) return

    // Find the actual scrollable element (could be codeContent or its child)
    let scrollableElement = codeContent
    
    // Check if codeContent itself is scrollable
    if (codeContent.scrollHeight <= codeContent.clientHeight) {
      // If not scrollable, check for pre element
      const codePre = codeContent.querySelector('.code-editor-pre')
      if (codePre && codePre.scrollHeight > codePre.clientHeight) {
        scrollableElement = codePre
      }
    }

    const handleScroll = () => {
      if (gutter.scrollTop !== scrollableElement.scrollTop) {
        gutter.scrollTop = scrollableElement.scrollTop
      }
    }

    // Sync on mount and when content changes
    const syncScroll = () => {
      gutter.scrollTop = scrollableElement.scrollTop
    }
    
    // Use requestAnimationFrame for smooth syncing
    let rafId = null
    const handleScrollRAF = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        handleScroll()
        rafId = null
      })
    }

    // Initial sync
    setTimeout(syncScroll, 0)

    scrollableElement.addEventListener('scroll', handleScrollRAF, { passive: true })
    
    // Also sync when gutter is scrolled manually
    const handleGutterScroll = () => {
      if (scrollableElement.scrollTop !== gutter.scrollTop) {
        scrollableElement.scrollTop = gutter.scrollTop
      }
    }
    
    gutter.addEventListener('scroll', handleGutterScroll, { passive: true })
    
    return () => {
      scrollableElement.removeEventListener('scroll', handleScrollRAF)
      gutter.removeEventListener('scroll', handleGutterScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [snippet.htmlCode, view])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.htmlCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logger.error('Failed to copy:', error)
    }
  }

  const handleDelete = () => {
    onDelete(snippet.id, snippet.title)
  }


  const handleEditTitle = () => {
    setIsEditingTitle(true)
    setEditedTitle(snippet.title)
  }

  const handleSaveTitle = () => {
    if (editedTitle.trim() && onUpdate) {
      onUpdate({
        ...snippet,
        title: editedTitle.trim(),
      })
    }
    setIsEditingTitle(false)
  }

  const handleCancelTitle = () => {
    setEditedTitle(snippet.title)
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      handleCancelTitle()
    }
  }

  // Render Preview View
  const renderPreviewView = () => (
    <div className="detail-container">
      <header className="detail-header">
        <div className="detail-header-content">
          <button className="btn-icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="detail-title-section">
            {isEditingTitle ? (
              <div className="title-edit-container">
                <input
                  ref={titleInputRef}
                  type="text"
                  className="title-input"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleSaveTitle}
                  placeholder="Enter title"
                />
                <div className="title-edit-actions">
                  <button
                    className="btn-icon-small btn-save"
                    onClick={handleSaveTitle}
                    title="Save"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="btn-icon-small"
                    onClick={handleCancelTitle}
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="title-display-container">
                  <h1>{snippet.title}</h1>
                  <button
                    className="btn-icon-small"
                    onClick={handleEditTitle}
                    title="Edit Title"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
                {snippet.description && (
                  <p className="detail-description">{snippet.description}</p>
                )}
              </>
            )}
          </div>
          <div className="detail-actions">
            <button
              className="btn btn-primary"
              onClick={() => updateView('code')}
            >
              <Code size={18} />
              View Code
            </button>
          </div>
        </div>
      </header>

      <div className="detail-main">
        <div className="preview-wrapper preview-only">
          <div className="preview-panel">
            <div className="preview-container" ref={previewRef}>
              {iframeLoading && (
                <div className="preview-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading preview...</p>
                </div>
              )}
              <iframe
                key={`preview-${snippet.id}-${view}`}
                ref={iframeRef}
                title="HTML Preview"
                className="preview-iframe"
                // Note: allow-same-origin is required for html2canvas screenshot generation
                // allow-scripts is needed for JavaScript in templates to work
                // This is safe because we sanitize all HTML before saving
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Render Code View
  const renderCodeView = () => (
    <div className="detail-container code-view-container">
      <header className="detail-header">
        <div className="detail-header-content">
          <button className="btn-icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="detail-title-section">
            <h1>{snippet.title}</h1>
            {snippet.description && (
              <p className="detail-description">{snippet.description}</p>
            )}
          </div>
          <div className="detail-actions">
            <button className="btn btn-secondary" onClick={() => updateView('preview')}>
              <Eye size={18} />
              Preview
            </button>
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy
                </>
              )}
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      </header>

      <div className="detail-main code-view-main">
        <div className="code-container-full">
          <div className="code-editor-wrapper" ref={editorWrapperRef}>
            {/* Line number gutter */}
            <div className="line-number-gutter" ref={gutterRef}>
              {snippet.htmlCode.split('\n').map((_, index) => (
                <div key={index} className="line-number-item">
                  {index + 1}
                </div>
              ))}
            </div>
            {/* Code editor */}
            <div className="code-editor-content">
            <Editor
              value={snippet.htmlCode}
              onValueChange={() => {}}
              highlight={(code) => {
                  // Just return highlighted code without line numbers - they'll be in a separate gutter
                  return Prism.highlight(code, Prism.languages.markup, 'markup')
              }}
              padding={10}
              style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
                fontSize: 14,
                lineHeight: 1.6,
                  backgroundColor: 'var(--code-bg, #1e1e1e)',
                  color: 'var(--text)',
                minHeight: '100%',
                outline: 'none',
              }}
              textareaClassName="code-editor-textarea read-only"
              preClassName="code-editor-pre"
            />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return view === 'preview' ? renderPreviewView() : renderCodeView()
}

export default SnippetDetail

