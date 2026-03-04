import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Grid,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Share2,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { snippetsService } from './services/snippetsService'
import { shareService } from './services/shareService'
import { analytics } from './utils/analytics'
import AddSnippetForm from './components/AddSnippetForm'
import SnippetCard from './components/SnippetCard'
import SnippetDetail from './components/SnippetDetail'
import MarketingLanding from './components/MarketingLanding'
import Auth from './components/Auth'
import Logo from './components/Logo'
import GradientBlur from './components/GradientBlur'
import ThemeSwitcher from './components/ThemeSwitcher'
import ConfirmDialog from './components/ConfirmDialog'
import { useToast } from './contexts/ToastContext'
import { logger } from './utils/logger'
import './App.css'

const ITEMS_PER_PAGE = 6

const readSaved = (key, fallback = '') => {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

const readUrlState = () => {
  const params = new URLSearchParams(window.location.search)
  return {
    snippetId: params.get('snippet'),
    shareToken: params.get('share'),
  }
}

function App() {
  const toast = useToast()
  const [snippets, setSnippets] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [selectedSnippet, setSelectedSnippet] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingSnippets, setLoadingSnippets] = useState(false)
  const [deletingSnippetId, setDeletingSnippetId] = useState(null)
  const [updatingSnippetId, setUpdatingSnippetId] = useState(null)
  const [togglingFavoriteId, setTogglingFavoriteId] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [currentPage, setCurrentPage] = useState(Number(readSaved('templio_currentPage', '1')) || 1)
  const [filter, setFilter] = useState(readSaved('templio_filter', 'newest'))
  const [searchInput, setSearchInput] = useState(readSaved('templio_search', ''))
  const [debouncedSearch, setDebouncedSearch] = useState(readSaved('templio_search', ''))
  const [selectedCollection, setSelectedCollection] = useState(readSaved('templio_collection', ''))
  const [selectedTag, setSelectedTag] = useState(readSaved('templio_tag', ''))
  const [metadata, setMetadata] = useState({ collections: [], tags: [] })
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    snippetId: null,
    snippetTitle: null,
  })
  const [urlState, setUrlState] = useState(readUrlState())
  const [sharedSnippet, setSharedSnippet] = useState(null)
  const [loadingSharedSnippet, setLoadingSharedSnippet] = useState(false)
  const [sharedSnippetError, setSharedSnippetError] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)

  useEffect(() => {
    const handlePopState = () => setUrlState(readUrlState())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const mutateUrl = useCallback((mutate, { replace = false } = {}) => {
    const url = new URL(window.location)
    mutate(url.searchParams)
    if (replace) {
      window.history.replaceState({}, '', url)
    } else {
      window.history.pushState({}, '', url)
    }
    setUrlState(readUrlState())
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setCurrentPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    localStorage.setItem('templio_filter', filter)
    localStorage.setItem('templio_currentPage', String(currentPage))
    localStorage.setItem('templio_search', searchInput)
    localStorage.setItem('templio_collection', selectedCollection)
    localStorage.setItem('templio_tag', selectedTag)
  }, [filter, currentPage, searchInput, selectedCollection, selectedTag])

  useEffect(() => {
    let mounted = true

    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash
      if (hash.includes('access_token') || hash.includes('refresh_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      logger.log('Auth state changed:', event, session?.user?.email || 'no user')

      if (event === 'INITIAL_SESSION') {
        setLoading(false)
        setUser(session?.user || null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
        setUser(session?.user || null)
        setLoading(false)
        return
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSnippets([])
        setSelectedSnippet(null)
        setTotalCount(0)
        setLoading(false)
        return
      }

      setUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadSnippets = useCallback(
    async ({ pageOverride } = {}) => {
      if (!user) return
      try {
        setLoadingSnippets(true)
        const page = pageOverride ?? currentPage
        const sort = filter === 'oldest' ? 'oldest' : 'newest'
        const favoritesOnly = filter === 'favorites'
        const { data, totalCount: count } = await snippetsService.getPage({
          page,
          pageSize: ITEMS_PER_PAGE,
          sort,
          favoritesOnly,
          search: debouncedSearch,
          collection: selectedCollection,
          tag: selectedTag,
        })
        setSnippets(data)
        setTotalCount(count)
      } catch (error) {
        logger.error('Error loading snippets:', error)
        toast.error('Failed to load templates. Please try again.', {
          title: 'Loading Error',
        })
      } finally {
        setLoadingSnippets(false)
      }
    },
    [user, currentPage, filter, debouncedSearch, selectedCollection, selectedTag, toast]
  )

  const loadMetadataAndCounts = useCallback(async () => {
    if (!user) return
    try {
      const nextMetadata = await snippetsService.getFilterMetadata()
      setMetadata(nextMetadata)
    } catch (error) {
      logger.error('Error loading metadata/counts:', error)
    }
  }, [user])

  useEffect(() => {
    if (!user || urlState.shareToken) return
    loadSnippets()
  }, [user, urlState.shareToken, loadSnippets])

  useEffect(() => {
    if (!user || urlState.shareToken) return
    loadMetadataAndCounts()
  }, [user, urlState.shareToken, loadMetadataAndCounts])

  useEffect(() => {
    const totalPages = Math.max(Math.ceil(totalCount / ITEMS_PER_PAGE), 1)
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalCount])

  useEffect(() => {
    if (!user || urlState.shareToken) return

    if (!urlState.snippetId) {
      setSelectedSnippet(null)
      return
    }

    const fromCurrentPage = snippets.find((snippet) => snippet.id === urlState.snippetId)
    if (fromCurrentPage) {
      setSelectedSnippet(fromCurrentPage)
      return
    }

    let cancelled = false
    snippetsService.getById(urlState.snippetId).then((snippet) => {
      if (cancelled) return
      if (snippet) {
        setSelectedSnippet(snippet)
      } else {
        mutateUrl((params) => {
          params.delete('snippet')
          params.delete('view')
        }, { replace: true })
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, snippets, urlState.snippetId, urlState.shareToken, mutateUrl])

  useEffect(() => {
    if (!urlState.shareToken) {
      setSharedSnippet(null)
      setSharedSnippetError('')
      setLoadingSharedSnippet(false)
      return
    }

    let cancelled = false
    setLoadingSharedSnippet(true)
    setSharedSnippetError('')

    shareService
      .getSharedSnippetByToken(urlState.shareToken)
      .then((snippet) => {
        if (cancelled) return
        if (!snippet) {
          setSharedSnippet(null)
          setSharedSnippetError('This shared link is invalid or expired.')
          return
        }
        setSharedSnippet(snippet)
      })
      .catch((error) => {
        if (cancelled) return
        logger.error('Error loading shared snippet:', error)
        setSharedSnippet(null)
        setSharedSnippetError(error.message || 'Failed to load shared template.')
      })
      .finally(() => {
        if (!cancelled) setLoadingSharedSnippet(false)
      })

    return () => {
      cancelled = true
    }
  }, [urlState.shareToken])

  useEffect(() => {
    if (!selectedSnippet || urlState.shareToken) {
      setShareUrl('')
      return
    }

    let cancelled = false

    shareService
      .getShareBySnippetId(selectedSnippet.id)
      .then((existingShare) => {
        if (cancelled || !existingShare?.token) return
        const url = new URL(window.location.origin + window.location.pathname)
        url.searchParams.set('share', existingShare.token)
        setShareUrl(url.toString())
      })
      .catch((error) => {
        if (cancelled) return
        logger.warn('Share lookup skipped:', error.message)
        setShareUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [selectedSnippet, urlState.shareToken])

  const handleAuthSuccess = () => {
    setShowAuth(false)
    loadSnippets()
    loadMetadataAndCounts()
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      logger.error('Error signing out:', error)
      toast.error('Failed to sign out. Please try again.')
    }
  }

  const reloadAll = async ({ pageOverride } = {}) => {
    await Promise.all([loadSnippets({ pageOverride }), loadMetadataAndCounts()])
  }

  const handleAddSnippet = async (snippet) => {
    try {
      await snippetsService.create(snippet)
      setShowForm(false)
      setCurrentPage(1)
      await reloadAll({ pageOverride: 1 })
      toast.success('Template saved successfully!', { title: 'Success' })
    } catch (error) {
      logger.error('Error adding snippet:', error)
      toast.error(error.message || 'Failed to save template. Please try again.', {
        title: 'Save Error',
      })
    }
  }

  const handleBatchAddSnippets = async (snippetsBatch) => {
    if (!Array.isArray(snippetsBatch) || snippetsBatch.length === 0) {
      return { createdCount: 0, failedCount: 0, failed: [] }
    }

    let createdCount = 0
    const failed = []

    for (const snippet of snippetsBatch) {
      try {
        await snippetsService.create(snippet)
        createdCount += 1
      } catch (error) {
        logger.error('Error importing snippet in batch:', error)
        failed.push({
          title: snippet.title,
          error: error.message || 'Failed to save snippet',
        })
      }
    }

    if (createdCount > 0) {
      setCurrentPage(1)
      await reloadAll({ pageOverride: 1 })
      setShowForm(false)
    }

    return {
      createdCount,
      failedCount: failed.length,
      failed,
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
      if (selectedSnippet?.id === snippetId) {
        mutateUrl((params) => {
          params.delete('snippet')
          params.delete('view')
        })
        setSelectedSnippet(null)
      }
      await reloadAll()
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
    analytics.trackView(snippet.id)
    setSelectedSnippet(snippet)
    mutateUrl((params) => {
      params.set('snippet', snippet.id)
      params.set('view', 'preview')
      params.delete('share')
    })
  }

  const handleBack = () => {
    setSelectedSnippet(null)
    mutateUrl((params) => {
      params.delete('snippet')
      params.delete('view')
    })
  }

  const handleUpdateSnippet = async (updatedSnippet) => {
    setUpdatingSnippetId(updatedSnippet.id)
    try {
      const saved = await snippetsService.update(updatedSnippet)
      setSelectedSnippet(saved)
      setSnippets((prev) => prev.map((snippet) => (snippet.id === saved.id ? saved : snippet)))
      await reloadAll()
      toast.success('Template updated successfully!')
    } catch (error) {
      logger.error('Error updating snippet:', error)
      toast.error('Failed to update template. Please try again.', { title: 'Update Error' })
    } finally {
      setUpdatingSnippetId(null)
    }
  }

  const handleToggleFavorite = async (id, isFavorite) => {
    setTogglingFavoriteId(id)
    try {
      const updated = await snippetsService.toggleFavorite(id, isFavorite)
      setSnippets((prev) => prev.map((snippet) => (snippet.id === id ? updated : snippet)))
      if (selectedSnippet?.id === id) {
        setSelectedSnippet(updated)
      }
      await loadMetadataAndCounts()
      if (filter === 'favorites') {
        await loadSnippets()
      }
      toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites', { duration: 1800 })
    } catch (error) {
      logger.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite status. Please try again.')
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  const handleCreateShare = async () => {
    if (!selectedSnippet) return
    setShareLoading(true)
    try {
      const share = await shareService.createOrUpdateShare(selectedSnippet)
      const url = new URL(window.location.origin + window.location.pathname)
      url.searchParams.set('share', share.token)
      const link = url.toString()
      setShareUrl(link)
      analytics.trackShare(selectedSnippet.id)
      await navigator.clipboard.writeText(link)
      toast.success('Share link created and copied.')
    } catch (error) {
      logger.error('Failed to create share link:', error)
      toast.error(error.message || 'Failed to create share link.')
    } finally {
      setShareLoading(false)
    }
  }

  const handleRevokeShare = async () => {
    if (!selectedSnippet) return
    setShareLoading(true)
    try {
      await shareService.revokeShare(selectedSnippet.id)
      setShareUrl('')
      toast.success('Share link revoked.')
    } catch (error) {
      logger.error('Failed to revoke share link:', error)
      toast.error(error.message || 'Failed to revoke share link.')
    } finally {
      setShareLoading(false)
    }
  }

  const clearShareUrlState = () => {
    mutateUrl((params) => {
      params.delete('share')
    })
  }

  const totalPages = Math.max(Math.ceil(totalCount / ITEMS_PER_PAGE), 1)

  if (urlState.shareToken) {
    if (loadingSharedSnippet) {
      return (
        <div className="app">
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading shared template...</p>
          </div>
        </div>
      )
    }

    if (!sharedSnippet) {
      return (
        <div className="app">
          <div className="empty-state">
            <Share2 size={56} />
            <h2>Shared Link Unavailable</h2>
            <p>{sharedSnippetError || 'This shared template could not be loaded.'}</p>
            <button className="btn btn-primary" onClick={clearShareUrlState}>
              Back to App
            </button>
          </div>
        </div>
      )
    }

    return (
      <SnippetDetail
        snippet={sharedSnippet}
        onBack={clearShareUrlState}
        readOnly
        sharedPreview
        onCopySnippet={(id) => analytics.trackCopy(id)}
        onTrackView={(id) => analytics.trackView(id)}
      />
    )
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

  if (!user && showAuth) {
    return <Auth onAuthSuccess={handleAuthSuccess} onBack={() => setShowAuth(false)} />
  }

  if (!user) {
    return <MarketingLanding onGetStarted={() => setShowAuth(true)} />
  }

  if (selectedSnippet) {
    return (
      <>
        <SnippetDetail
          snippet={selectedSnippet}
          onBack={handleBack}
          onDelete={() => handleDeleteClick(selectedSnippet.id, selectedSnippet.title)}
          onUpdate={handleUpdateSnippet}
          onCopySnippet={(id) => analytics.trackCopy(id)}
          onTrackView={(id) => analytics.trackView(id)}
          onCreateShare={handleCreateShare}
          onRevokeShare={handleRevokeShare}
          shareUrl={shareUrl}
          shareLoading={shareLoading || updatingSnippetId === selectedSnippet.id}
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
            <button className="btn btn-primary" onClick={() => setShowForm((prev) => !prev)}>
              <Plus size={20} />
              <span>Add Template</span>
            </button>
            <button className="btn btn-secondary" onClick={handleLogout} title="Sign Out">
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
            onBatchSubmit={handleBatchAddSnippets}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div className="filters-container">
          <div className="filter-group search-group">
            <Search size={18} />
            <input
              type="search"
              className="search-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search templates..."
              aria-label="Search templates"
            />
          </div>

          <div className="filter-group">
            <Filter size={18} />
            <select
              className="filter-select"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value)
                setCurrentPage(1)
              }}
              aria-label="Sort and favorites filter"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="favorites">Favorites</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              className="filter-select"
              value={selectedCollection}
              onChange={(e) => {
                setSelectedCollection(e.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter by collection"
            >
              <option value="">All Collections</option>
              {metadata.collections.map((collection) => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              className="filter-select"
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter by tag"
            >
              <option value="">All Tags</option>
              {metadata.tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

        </div>

        {loadingSnippets && snippets.length === 0 ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading templates...</p>
          </div>
        ) : snippets.length === 0 ? (
          <div className="empty-state">
            <Grid size={64} />
            <h2>No templates found</h2>
            <p>Try changing filters or add a new template.</p>
          </div>
        ) : (
          <div className="snippets-grid">
            {snippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                onView={handleViewSnippet}
                onDelete={() => handleDeleteClick(snippet.id, snippet.title)}
                onToggleFavorite={handleToggleFavorite}
                isDeleting={deletingSnippetId === snippet.id}
                isTogglingFavorite={togglingFavoriteId === snippet.id}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Go to page ${page}`}
                    >
                      {page}
                    </button>
                  )
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
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
