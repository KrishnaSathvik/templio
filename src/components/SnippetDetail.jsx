import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Trash2,
  Copy,
  Check,
  Code,
  X,
  Edit2,
  Eye,
  Link2,
  Unlink,
  Shield,
  ShieldAlert,
} from 'lucide-react'
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
import { stripDevRuntimeArtifacts } from '../utils/htmlCleanup'
import './SnippetDetail.css'

function SnippetDetail({
  snippet,
  onBack,
  onDelete,
  onUpdate,
  readOnly = false,
  sharedPreview = false,
  onCopySnippet,
  onTrackView,
  onCreateShare,
  onRevokeShare,
  onShareToTarget,
  shareUrl,
  shareLoading = false,
}) {
  const directShareTargets = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'imessage', label: 'iMessage' },
    { id: 'chatgpt', label: 'ChatGPT' },
    { id: 'claude', label: 'Claude' },
    { id: 'gemini', label: 'Gemini' },
  ]

  const getInitialView = () => {
    if (sharedPreview) return 'preview'
    const params = new URLSearchParams(window.location.search)
    return params.get('view') === 'code' ? 'code' : 'preview'
  }

  const [view, setView] = useState(getInitialView())
  const [copied, setCopied] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(snippet.title)
  const [iframeLoading, setIframeLoading] = useState(true)
  const [allowUnsafeScripts, setAllowUnsafeScripts] = useState(true)
  const iframeRef = useRef(null)
  const titleInputRef = useRef(null)
  const gutterRef = useRef(null)
  const editorWrapperRef = useRef(null)

  useEffect(() => {
    onTrackView?.(snippet.id)
  }, [snippet.id, onTrackView])

  useEffect(() => {
    if (sharedPreview) {
      setView('preview')
      return
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') !== 'code') {
      setView('preview')
    }
  }, [snippet.id, sharedPreview])

  useEffect(() => {
    if (!sharedPreview) return
    setAllowUnsafeScripts(true)
  }, [sharedPreview, snippet.id])

  useEffect(() => {
    setEditedTitle(snippet.title)
  }, [snippet.id, snippet.title])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const updateView = (newView) => {
    if (sharedPreview && newView !== 'preview') {
      return
    }
    setView(newView)
    if (sharedPreview) {
      return
    }
    const url = new URL(window.location)
    url.searchParams.set('view', newView)
    window.history.replaceState({}, '', url)
  }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !snippet.htmlCode || view !== 'preview') return

    setIframeLoading(true)

    const sourceHtml = snippet.htmlCode.trim()
    const secureHtml = validateAndSanitizeHTML(sourceHtml).sanitized
    const fullHtml = stripDevRuntimeArtifacts(sourceHtml).html
    let html = allowUnsafeScripts ? fullHtml : secureHtml

    const hasFullDocument = /<!doctype html/i.test(html) || /<html[\s\S]*?>/i.test(html)
    if (!hasFullDocument) {
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
      setTimeout(() => setIframeLoading(false), 120)
    }

    iframe.srcdoc = html
    iframe.addEventListener('load', handleLoad, { once: true })
    const timeout = setTimeout(() => setIframeLoading(false), 1200)

    return () => {
      iframe.removeEventListener('load', handleLoad)
      clearTimeout(timeout)
    }
  }, [snippet.htmlCode, view, allowUnsafeScripts])

  useEffect(() => {
    if (view !== 'code') return

    const editorWrapper = editorWrapperRef.current
    const gutter = gutterRef.current
    if (!editorWrapper || !gutter) return

    const codeContent = editorWrapper.querySelector('.code-editor-content')
    if (!codeContent) return

    let scrollableElement = codeContent
    if (codeContent.scrollHeight <= codeContent.clientHeight) {
      const codePre = codeContent.querySelector('.code-editor-pre')
      if (codePre && codePre.scrollHeight > codePre.clientHeight) {
        scrollableElement = codePre
      }
    }

    const syncFromEditor = () => {
      if (gutter.scrollTop !== scrollableElement.scrollTop) {
        gutter.scrollTop = scrollableElement.scrollTop
      }
    }

    let rafId = null
    const handleScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        syncFromEditor()
        rafId = null
      })
    }

    const handleGutterScroll = () => {
      if (scrollableElement.scrollTop !== gutter.scrollTop) {
        scrollableElement.scrollTop = gutter.scrollTop
      }
    }

    gutter.scrollTop = scrollableElement.scrollTop
    scrollableElement.addEventListener('scroll', handleScroll, { passive: true })
    gutter.addEventListener('scroll', handleGutterScroll, { passive: true })

    return () => {
      scrollableElement.removeEventListener('scroll', handleScroll)
      gutter.removeEventListener('scroll', handleGutterScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [snippet.htmlCode, view])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.htmlCode)
      setCopied(true)
      onCopySnippet?.(snippet.id)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logger.error('Failed to copy:', error)
    }
  }

  const handleEditTitle = () => {
    if (readOnly) return
    setIsEditingTitle(true)
    setEditedTitle(snippet.title)
  }

  const handleSaveTitle = () => {
    if (readOnly) return
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

  const renderShareActions = () => {
    if (readOnly) return null
    return (
      <>
        {shareUrl ? (
          <button className="btn btn-secondary" onClick={onRevokeShare} disabled={shareLoading}>
            <Unlink size={18} />
            Revoke Link
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={onCreateShare} disabled={shareLoading}>
            <Link2 size={18} />
            {shareLoading ? 'Creating...' : 'Create Share Link'}
          </button>
        )}
      </>
    )
  }

  const renderDirectShareActions = () => {
    if (readOnly || !onShareToTarget) return null

    return (
      <div className="detail-direct-share">
        <span className="detail-direct-share-label">Share via:</span>
        <div className="detail-direct-share-buttons">
          {directShareTargets.map((target) => (
            <button
              key={target.id}
              type="button"
              className="btn btn-secondary btn-share-target"
              onClick={() => onShareToTarget(target.id)}
              disabled={shareLoading}
              title={`Share public link via ${target.label}`}
            >
              {target.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderPreviewSecurityControls = () => (
    sharedPreview ? null : (
    <button
      className={`btn ${allowUnsafeScripts ? 'btn-secondary' : 'btn-primary'}`}
      onClick={() => setAllowUnsafeScripts((prev) => !prev)}
      title={
        allowUnsafeScripts
          ? 'Switch to Safe Preview (blocks scripts)'
          : 'Switch to Full Preview (allows scripts and dynamic styling)'
      }
    >
      {allowUnsafeScripts ? (
        <>
          <Shield size={18} />
          Safe Preview
        </>
      ) : (
        <>
          <ShieldAlert size={18} />
          Full Preview
        </>
      )}
    </button>
    )
  )

  const renderHeaderTitle = () => {
    if (isEditingTitle && !readOnly) {
      return (
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
            <button className="btn-icon-small btn-save" onClick={handleSaveTitle} title="Save title">
              <Check size={16} />
            </button>
            <button className="btn-icon-small" onClick={handleCancelTitle} title="Cancel title edit">
              <X size={16} />
            </button>
          </div>
        </div>
      )
    }

    return (
      <>
        {sharedPreview && (
          <div className="shared-preview-banner" role="status" aria-label="Shared preview read-only">
            Shared Preview • Read-only link
          </div>
        )}
        <div className="title-display-container">
          <h1>{snippet.title}</h1>
          {!readOnly && (
            <button className="btn-icon-small" onClick={handleEditTitle} title="Edit title">
              <Edit2 size={18} />
            </button>
          )}
        </div>
        {snippet.description && <p className="detail-description">{snippet.description}</p>}
        {!readOnly && shareUrl && (
          <p className="detail-share-url">
            Share URL: <code>{shareUrl}</code>
          </p>
        )}
        {renderDirectShareActions()}
        {(snippet.collection || (snippet.tags && snippet.tags.length > 0)) && (
          <div className="detail-chip-row">
            {snippet.collection ? <span className="detail-chip">{snippet.collection}</span> : null}
            {(snippet.tags || []).slice(0, 8).map((tag) => (
              <span key={`${snippet.id}-${tag}`} className="detail-chip muted">
                {tag}
              </span>
            ))}
          </div>
        )}
      </>
    )
  }

  const renderPreviewView = () => (
    <div className="detail-container">
      <header className="detail-header">
        <div className="detail-header-content">
          <button className="btn-icon" onClick={onBack} aria-label="Back to templates list">
            <ArrowLeft size={20} />
          </button>
          <div className="detail-title-section">{renderHeaderTitle()}</div>
          <div className="detail-actions">
            {renderPreviewSecurityControls()}
            {renderShareActions()}
            {!sharedPreview && (
              <button className="btn btn-primary" onClick={() => updateView('code')}>
                <Code size={18} />
                View Code
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="detail-main">
        <div className="preview-wrapper preview-only">
          <div className="preview-panel">
            <div className="preview-container">
              {!allowUnsafeScripts && (
                <div className="preview-safety-note">
                  Safe preview mode can hide script-based styling. Switch to Full Preview if needed.
                </div>
              )}
              {iframeLoading && (
                <div className="preview-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading preview...</p>
                </div>
              )}
              <iframe
                key={`preview-${snippet.id}-${view}-${allowUnsafeScripts ? 'unsafe' : 'safe'}`}
                ref={iframeRef}
                title="HTML Preview"
                className="preview-iframe"
                sandbox={allowUnsafeScripts ? 'allow-same-origin allow-scripts allow-forms allow-popups' : 'allow-same-origin'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCodeView = () => (
    <div className="detail-container code-view-container">
      <header className="detail-header">
        <div className="detail-header-content">
          <button className="btn-icon" onClick={onBack} aria-label="Back to templates list">
            <ArrowLeft size={20} />
          </button>
          <div className="detail-title-section">
            <h1>{snippet.title}</h1>
            {snippet.description && <p className="detail-description">{snippet.description}</p>}
            {!readOnly && shareUrl && (
              <p className="detail-share-url">
                Share URL: <code>{shareUrl}</code>
              </p>
            )}
            {renderDirectShareActions()}
          </div>
          <div className="detail-actions">
            {renderShareActions()}
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
            {!readOnly && (
              <button className="btn btn-danger" onClick={onDelete}>
                <Trash2 size={18} />
                Delete
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="detail-main code-view-main">
        <div className="code-container-full">
          <div className="code-editor-wrapper" ref={editorWrapperRef}>
            <div className="line-number-gutter" ref={gutterRef}>
              {snippet.htmlCode.split('\n').map((_, index) => (
                <div key={index} className="line-number-item">
                  {index + 1}
                </div>
              ))}
            </div>
            <div className="code-editor-content">
              <Editor
                value={snippet.htmlCode}
                onValueChange={() => {}}
                highlight={(code) => Prism.highlight(code, Prism.languages.markup, 'markup')}
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

  if (sharedPreview) {
    return renderPreviewView()
  }

  return view === 'preview' ? renderPreviewView() : renderCodeView()
}

export default SnippetDetail
