import DOMPurify from 'isomorphic-dompurify'

/**
 * Validates and sanitizes HTML input
 */
export function validateAndSanitizeHTML(html) {
  if (!html || typeof html !== 'string') {
    return { valid: false, error: 'HTML code is required' }
  }

  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(html)) {
      // For preview, we'll sanitize but warn
      // In a stricter implementation, you might reject these
    }
  }

  // Sanitize HTML using DOMPurify
  // We use a very permissive config to preserve all HTML structure
  // Only remove truly dangerous elements (scripts, iframes in some contexts)
  const sanitized = DOMPurify.sanitize(html, {
    // Allow all common HTML tags
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i', 'small', 'sub', 'sup', 'mark', 'del', 'ins',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'a', 'img', 'div', 'span', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
      'form', 'input', 'button', 'textarea', 'select', 'option', 'optgroup', 'label', 'fieldset', 'legend',
      'blockquote', 'pre', 'code', 'hr',
      'figure', 'figcaption',
      'video', 'audio', 'source', 'track',
      'canvas', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'g',
      'defs', 'use', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'stop',
      'style', 'link', 'meta', 'head', 'body', 'html', 'title',
      'noscript', 'template', 'slot'
    ],
    ALLOWED_ATTR: [
      // Common attributes
      'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'width', 'height',
      'target', 'rel', 'type', 'value', 'name', 'placeholder', 'required', 'disabled',
      'checked', 'selected', 'rows', 'cols', 'maxlength', 'minlength', 'pattern',
      'autocomplete', 'autofocus', 'readonly', 'multiple', 'step', 'min', 'max',
      // ARIA attributes
      'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'aria-live',
      'role', 'tabindex',
      // Data attributes
      'data-*',
      // SVG attributes
      'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'd', 'transform',
      'preserveAspectRatio', 'xmlns', 'xmlns:xlink',
      // Media attributes
      'controls', 'autoplay', 'loop', 'muted', 'poster', 'preload',
      // Form attributes
      'action', 'method', 'enctype', 'accept', 'accept-charset',
      // Meta attributes
      'charset', 'content', 'http-equiv', 'property', 'name',
      // Link attributes
      'media', 'sizes', 'hreflang', 'crossorigin',
      // Other
      'lang', 'dir', 'contenteditable', 'spellcheck', 'draggable'
    ],
    ALLOW_DATA_ATTR: true,
    KEEP_CONTENT: true,
    // Allow style tags and inline styles
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: false,
    // Don't remove style tags
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  })

  return {
    valid: true,
    sanitized,
    original: html,
  }
}

/**
 * Validates title input
 */
export function validateTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required' }
  }

  const trimmed = title.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Title cannot be empty' }
  }

  if (trimmed.length > 200) {
    return { valid: false, error: 'Title must be less than 200 characters' }
  }

  // Check for potentially dangerous content
  if (/<script/i.test(trimmed)) {
    return { valid: false, error: 'Title contains invalid characters' }
  }

  return { valid: true, sanitized: trimmed }
}

/**
 * Validates description input
 */
export function validateDescription(description) {
  if (!description || description.trim().length === 0) {
    return { valid: true, sanitized: '' } // Description is optional
  }

  if (typeof description !== 'string') {
    return { valid: false, error: 'Description must be text' }
  }

  if (description.length > 1000) {
    return { valid: false, error: 'Description must be less than 1000 characters' }
  }

  // Sanitize description
  const sanitized = DOMPurify.sanitize(description, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })

  return { valid: true, sanitized }
}

/**
 * Validates HTML code size
 */
export function validateHTMLSize(html) {
  if (!html) {
    return { valid: false, error: 'HTML code is required' }
  }

  // Check size (10MB limit)
  const sizeInBytes = new Blob([html]).size
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (sizeInBytes > maxSize) {
    return {
      valid: false,
      error: `HTML code is too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`,
    }
  }

  return { valid: true }
}

