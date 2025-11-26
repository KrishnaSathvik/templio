/**
 * HTTPS Enforcement Utility
 * Ensures the app only runs over HTTPS in production
 */

/**
 * Checks if the current connection is secure (HTTPS)
 */
export function isSecureConnection() {
  if (typeof window === 'undefined') return true // Server-side, assume secure
  
  // Check if protocol is HTTPS
  return window.location.protocol === 'https:'
}

/**
 * Checks if we're in production environment
 */
export function isProduction() {
  // Check if we're not in development
  return import.meta.env.PROD
}

/**
 * Checks if we're on localhost (development)
 */
export function isLocalhost() {
  if (typeof window === 'undefined') return false
  
  const hostname = window.location.hostname
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  )
}

/**
 * Enforces HTTPS by redirecting HTTP to HTTPS in production
 * Only runs in production and on non-localhost domains
 */
export function enforceHTTPS() {
  // Don't enforce in development
  if (!isProduction()) {
    return
  }

  // Don't enforce on localhost
  if (isLocalhost()) {
    return
  }

  // If already secure, nothing to do
  if (isSecureConnection()) {
    return
  }

  // Redirect HTTP to HTTPS
  const currentUrl = window.location.href
  const httpsUrl = currentUrl.replace(/^http:/, 'https:')
  
  // Only redirect if URL actually changed
  if (httpsUrl !== currentUrl) {
    console.warn('Redirecting to HTTPS for security...')
    window.location.replace(httpsUrl)
  }
}

/**
 * Initializes HTTPS enforcement
 * Call this once when the app starts
 */
export function initHTTPSEnforcement() {
  // Run immediately
  enforceHTTPS()

  // Also listen for navigation changes (SPA routing)
  if (typeof window !== 'undefined') {
    // Check on page load
    window.addEventListener('load', enforceHTTPS)
    
    // Check on hash change (for SPAs)
    window.addEventListener('hashchange', enforceHTTPS)
  }
}

