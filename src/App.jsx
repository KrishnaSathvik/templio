import { useState, useEffect } from 'react'
import { Plus, Grid, LogOut, User, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { supabase } from './lib/supabase'
import { snippetsService } from './services/snippetsService'
import AddSnippetForm from './components/AddSnippetForm'
import SnippetCard from './components/SnippetCard'
import SnippetDetail from './components/SnippetDetail'
import Auth from './components/Auth'
import Logo from './components/Logo'
import GradientBlur from './components/GradientBlur'
import ThemeSwitcher from './components/ThemeSwitcher'
import ConfirmDialog from './components/ConfirmDialog'
import { useToast } from './contexts/ToastContext'
import { logger } from './utils/logger'
import './App.css'

function App() {
  const toast = useToast()
  
  // Load snippets from cache on mount to prevent flash of empty state
  const loadCachedSnippets = () => {
    try {
      const cached = localStorage.getItem('snippets_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        // Only use cache if it's less than 5 minutes old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data || []
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return []
  }

  // Load filter from localStorage
  const loadFilter = () => {
    try {
      const saved = localStorage.getItem('templio_filter')
      if (saved && ['newest', 'oldest', 'favorites'].includes(saved)) {
        return saved
      }
    } catch (e) {
      // Ignore errors
    }
    return 'newest'
  }

  // Load current page from localStorage
  const loadCurrentPage = () => {
    try {
      const saved = localStorage.getItem('templio_currentPage')
      if (saved) {
        const page = parseInt(saved, 10)
        if (page > 0) return page
      }
    } catch (e) {
      // Ignore errors
    }
    return 1
  }

  const [snippets, setSnippets] = useState(loadCachedSnippets())
  const [showForm, setShowForm] = useState(false)
  const [selectedSnippet, setSelectedSnippet] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingSnippets, setLoadingSnippets] = useState(false)
  const [deletingSnippetId, setDeletingSnippetId] = useState(null)
  const [updatingSnippetId, setUpdatingSnippetId] = useState(null)
  const [togglingFavoriteId, setTogglingFavoriteId] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [currentPage, setCurrentPage] = useState(loadCurrentPage())
  const [filter, setFilter] = useState(loadFilter()) // 'newest', 'oldest', 'favorites'
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, snippetId: null, snippetTitle: null })
  const itemsPerPage = 6

  // Restore selected snippet from URL when snippets are loaded
  useEffect(() => {
    if (snippets.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const snippetId = params.get('snippet')
    
    if (snippetId) {
      const snippet = snippets.find(s => s.id === snippetId)
      if (snippet) {
        // Only update if different to avoid unnecessary re-renders
        setSelectedSnippet(prev => {
          if (prev?.id === snippetId) return prev
          return snippet
        })
      } else {
        // Snippet not found, clear from URL
        const url = new URL(window.location)
        url.searchParams.delete('snippet')
        url.searchParams.delete('view')
        window.history.replaceState({}, '', url)
        setSelectedSnippet(null)
      }
    }
  }, [snippets])

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const snippetId = params.get('snippet')
      
      if (snippetId && snippets.length > 0) {
        const snippet = snippets.find(s => s.id === snippetId)
        if (snippet) {
          setSelectedSnippet(snippet)
        } else {
          setSelectedSnippet(null)
        }
      } else {
        setSelectedSnippet(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [snippets])

  useEffect(() => {
    let mounted = true

    // Clear any URL hash fragments that might contain expired tokens
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash
      // Check if hash contains auth tokens
      if (hash.includes('access_token') || hash.includes('refresh_token')) {
        // Clear the hash to prevent using expired URL sessions
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }

    // Listen for auth changes - this handles session restoration automatically
    // The INITIAL_SESSION event fires when Supabase restores the session from storage
    // This is the recommended way to handle session persistence
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log('Auth state changed:', event, session?.user?.email || 'no user')
      
      if (!mounted) return
      
      // Handle initial session restoration - this is the key event on page load
      if (event === 'INITIAL_SESSION') {
        setLoading(false)
        if (session?.user) {
          setUser(session.user)
          loadSnippets()
        } else {
          setUser(null)
        }
        return
      }
      
      // Handle sign in
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Clear URL hash after successful sign in
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
        if (session?.user) {
          setUser(session.user)
          loadSnippets()
        }
        setLoading(false)
        return
      }
      
      // Handle sign out
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSnippets([])
        setLoading(false)
        // Clear cache on logout
        try {
          localStorage.removeItem('snippets_cache')
        } catch (e) {
          // Ignore
        }
        return
      }
      
      // Handle other events
      if (session?.user) {
        setUser(session.user)
        if (event === 'USER_UPDATED') {
          loadSnippets()
        }
      } else {
        setUser(null)
        setSnippets([])
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadSnippets = async () => {
    try {
      setLoadingSnippets(true)
      const data = await snippetsService.getAll()
      setSnippets(data)
      // Cache snippets for faster loading on refresh
      try {
        localStorage.setItem('snippets_cache', JSON.stringify({
          data,
          timestamp: Date.now()
        }))
      } catch (e) {
        // Ignore cache errors
      }
    } catch (error) {
      logger.error('Error loading snippets:', error)
      toast.error('Failed to load templates. Please try again.', {
        title: 'Loading Error',
      })
    } finally {
      setLoadingSnippets(false)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuth(false)
    loadSnippets()
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setSnippets([])
      setSelectedSnippet(null)
      toast.success('Signed out successfully')
    } catch (error) {
      logger.error('Error signing out:', error)
      toast.error('Failed to sign out. Please try again.')
    }
  }

  const handleAddSnippet = async (snippet) => {
    try {
      const newSnippet = await snippetsService.create(snippet)
      const updated = [newSnippet, ...snippets]
      setSnippets(updated)
      // Update cache
      try {
        localStorage.setItem('snippets_cache', JSON.stringify({
          data: updated,
          timestamp: Date.now()
        }))
      } catch (e) {
        // Ignore cache errors
      }
      setShowForm(false)
      toast.success('Template saved successfully!', {
        title: 'Success',
      })
    } catch (error) {
      logger.error('Error adding snippet:', error)
      toast.error(
        error.message || 'Failed to save template. Please try again.',
        {
          title: 'Save Error',
        }
      )
    }
  }

  const handleDeleteClick = (id, title) => {
    setDeleteConfirm({ isOpen: true, snippetId: id, snippetTitle: title })
  }

  const handleDeleteConfirm = async () => {
    const { snippetId } = deleteConfirm
    if (!snippetId) return

    setDeleteConfirm({ isOpen: false, snippetId: null, snippetTitle: null })
    setDeletingSnippetId(snippetId)
    try {
      await snippetsService.delete(snippetId)
      const updated = snippets.filter((s) => s.id !== snippetId)
      setSnippets(updated)
      // Update cache
      try {
        localStorage.setItem('snippets_cache', JSON.stringify({
          data: updated,
          timestamp: Date.now()
        }))
      } catch (e) {
        // Ignore cache errors
      }
      // If deleted snippet was selected, go back
      if (selectedSnippet?.id === snippetId) {
        setSelectedSnippet(null)
        // Clear snippet from URL
        const url = new URL(window.location)
        url.searchParams.delete('snippet')
        url.searchParams.delete('view')
        window.history.replaceState({}, '', url)
      }
      toast.success('Template deleted successfully')
    } catch (error) {
      logger.error('Error deleting snippet:', error)
      toast.error('Failed to delete template. Please try again.', {
        title: 'Delete Error',
      })
    } finally {
      setDeletingSnippetId(null)
    }
  }

  const handleViewSnippet = (snippet) => {
    setSelectedSnippet(snippet)
    // Update URL to persist the selected snippet, default to preview view
    const url = new URL(window.location)
    url.searchParams.set('snippet', snippet.id)
    url.searchParams.set('view', 'preview') // Always start with preview when clicking a template
    window.history.pushState({}, '', url)
  }

  const handleBack = () => {
    setSelectedSnippet(null)
    // Clear snippet from URL
    const url = new URL(window.location)
    url.searchParams.delete('snippet')
    window.history.pushState({}, '', url)
  }

  // Filter and sort snippets
  const getFilteredAndSortedSnippets = () => {
    let filtered = [...snippets]

    // Apply filter
    if (filter === 'favorites') {
      filtered = filtered.filter((s) => s.isFavorite)
    }

    // Apply sorting
    if (filter === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (filter === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    } else if (filter === 'favorites') {
      // For favorites, show newest first
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    return filtered
  }

  const filteredSnippets = getFilteredAndSortedSnippets()

  // Pagination calculations
  const totalPages = Math.ceil(filteredSnippets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSnippets = filteredSnippets.slice(startIndex, endIndex)

  // Reset to page 1 when snippets or filter change
  useEffect(() => {
    const totalPages = Math.ceil(filteredSnippets.length / itemsPerPage)
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
      try {
        localStorage.setItem('templio_currentPage', '1')
      } catch (e) {
        // Ignore errors
      }
    }
  }, [filteredSnippets.length, currentPage, filter])

  const handlePageChange = (page) => {
    setCurrentPage(page)
    // Save current page to localStorage
    try {
      localStorage.setItem('templio_currentPage', page.toString())
    } catch (e) {
      // Ignore errors
    }
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleUpdateSnippet = async (updatedSnippet) => {
    setUpdatingSnippetId(updatedSnippet.id)
    try {
      const saved = await snippetsService.update(updatedSnippet)
      const updated = snippets.map((s) => (s.id === saved.id ? saved : s))
      setSnippets(updated)
      // Update cache
      try {
        localStorage.setItem('snippets_cache', JSON.stringify({
          data: updated,
          timestamp: Date.now()
        }))
      } catch (e) {
        // Ignore cache errors
      }
      setSelectedSnippet(saved)
      // Ensure URL is updated with snippet ID
      const url = new URL(window.location)
      url.searchParams.set('snippet', saved.id)
      window.history.replaceState({}, '', url)
      toast.success('Template updated successfully!')
    } catch (error) {
      logger.error('Error updating snippet:', error)
      toast.error('Failed to update template. Please try again.', {
        title: 'Update Error',
      })
    } finally {
      setUpdatingSnippetId(null)
    }
  }

  const handleToggleFavorite = async (id, isFavorite) => {
    setTogglingFavoriteId(id)
    try {
      const updated = await snippetsService.toggleFavorite(id, isFavorite)
      const newSnippets = snippets.map((s) => (s.id === id ? updated : s))
      setSnippets(newSnippets)
      // Update cache
      try {
        localStorage.setItem('snippets_cache', JSON.stringify({
          data: newSnippets,
          timestamp: Date.now()
        }))
      } catch (e) {
        // Ignore cache errors
      }
      // Update selected snippet if it's the one being favorited
      if (selectedSnippet?.id === id) {
        setSelectedSnippet(updated)
      }
      toast.success(
        isFavorite ? 'Added to favorites' : 'Removed from favorites',
        { duration: 2000 }
      )
    } catch (error) {
      logger.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite status. Please try again.')
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || showAuth) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  if (selectedSnippet) {
    return (
      <>
        <SnippetDetail
          snippet={selectedSnippet}
          onBack={handleBack}
          onDelete={() => handleDeleteClick(selectedSnippet.id, selectedSnippet.title)}
          onUpdate={handleUpdateSnippet}
        />
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen && deleteConfirm.snippetId === selectedSnippet.id}
          title="Delete Template"
          message={`Are you sure you want to delete "${deleteConfirm.snippetTitle || 'this template'}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm({ isOpen: false, snippetId: null, snippetTitle: null })}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </>
    )
  }

  return (
    <div className="app">
      <GradientBlur />
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <Logo />
          </div>
          <div className="header-actions">
            <ThemeSwitcher />
            <div className="user-info">
              <User size={18} />
              <span className="user-email">{user.email}</span>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus size={20} />
              <span>Add Template</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={18} />
              <span className="logout-text">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {showForm && (
          <AddSnippetForm
            onSubmit={handleAddSnippet}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loadingSnippets && snippets.length === 0 ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading templates...</p>
          </div>
        ) : snippets.length === 0 ? (
          <div className="empty-state">
            <Grid size={64} />
            <h2>No templates yet</h2>
            <p>Click "Add Template" to save your first HTML template</p>
          </div>
        ) : (
          <>
            <div className="filters-container">
              <div className="filter-group">
                <Filter size={18} />
                <select
                  className="filter-select"
                  value={filter}
                  onChange={(e) => {
                    const newFilter = e.target.value
                    setFilter(newFilter)
                    setCurrentPage(1)
                    // Save filter to localStorage
                    try {
                      localStorage.setItem('templio_filter', newFilter)
                    } catch (e) {
                      // Ignore errors
                    }
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="favorites">Favorites</option>
                </select>
              </div>
            </div>
            <div className="snippets-grid">
              {currentSnippets.length === 0 ? (
                <div className="empty-state">
                  <Grid size={64} />
                  <h2>No templates found</h2>
                  <p>
                    {filter === 'favorites'
                      ? "You haven't favorited any templates yet"
                      : 'No templates match your filter'}
                  </p>
                </div>
              ) : (
                currentSnippets.map((snippet) => (
                  <SnippetCard
                    key={snippet.id}
                    snippet={snippet}
                    onView={handleViewSnippet}
                    onDelete={() => handleDeleteClick(snippet.id, snippet.title)}
                    onToggleFavorite={handleToggleFavorite}
                    isDeleting={deletingSnippetId === snippet.id}
                    isTogglingFavorite={togglingFavoriteId === snippet.id}
                  />
                ))
              )}
            </div>
            
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                          aria-label={`Go to page ${page}`}
                        >
                          {page}
                        </button>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="pagination-ellipsis">
                          ...
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
                
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen && !selectedSnippet}
        title="Delete Template"
        message={`Are you sure you want to delete "${deleteConfirm.snippetTitle || 'this template'}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false, snippetId: null, snippetTitle: null })}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
}

export default App

