import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get saved theme from localStorage or default to 'system'
    const saved = localStorage.getItem('theme')
    return saved || 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  })

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('theme', theme)

    // Determine resolved theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const updateTheme = (e) => {
        setResolvedTheme(e.matches ? 'dark' : 'light')
      }
      
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
      mediaQuery.addEventListener('change', updateTheme)
      
      return () => mediaQuery.removeEventListener('change', updateTheme)
    } else {
      setResolvedTheme(theme)
    }
  }, [theme])

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.remove('light-theme')
      root.classList.add('dark-theme')
    } else {
      root.classList.remove('dark-theme')
      root.classList.add('light-theme')
    }
  }, [resolvedTheme])

  // Initialize theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system'
    const initialTheme = saved === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : saved
    
    const root = document.documentElement
    if (initialTheme === 'dark') {
      root.classList.add('dark-theme')
    } else {
      root.classList.add('light-theme')
    }
  }, [])

  const changeTheme = (newTheme) => {
    setTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

