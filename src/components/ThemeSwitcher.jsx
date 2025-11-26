import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import './ThemeSwitcher.css'

function ThemeSwitcher() {
  const { theme, changeTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ]

  const currentTheme = themes.find(t => t.value === theme)
  const CurrentIcon = currentTheme?.icon || Monitor

  return (
    <div className="theme-switcher" ref={dropdownRef}>
      <button
        className="theme-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change theme"
        title="Change theme"
      >
        <CurrentIcon size={18} />
      </button>
      
      {isOpen && (
        <div className="theme-switcher-dropdown">
          {themes.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              className={`theme-switcher-option ${theme === value ? 'active' : ''}`}
              onClick={() => {
                changeTheme(value)
                setIsOpen(false)
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
              {theme === value && <span className="check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ThemeSwitcher

