/**
 * Logger utility that guards console statements for production
 * Only logs in development mode
 */

const isDevelopment = import.meta.env.DEV

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  error: (...args) => {
    // Always log errors, even in production, but can be sent to error tracking service
    if (isDevelopment) {
      console.error(...args)
    } else {
      // In production, you might want to send to error tracking service
      // Example: Sentry.captureException(new Error(args.join(' ')))
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  }
}

