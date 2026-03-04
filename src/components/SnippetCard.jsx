import { Trash2, Calendar, Star } from 'lucide-react'
import './SnippetCard.css'

function SnippetCard({ snippet, onView, onDelete, onToggleFavorite, isDeleting, isTogglingFavorite }) {
  if (!snippet) return null

  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete(snippet.id, snippet.title)
  }

  const handleToggleFavorite = (e) => {
    e.stopPropagation()
    if (onToggleFavorite && !isTogglingFavorite) {
      onToggleFavorite(snippet.id, !snippet.isFavorite)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="snippet-card" onClick={() => onView(snippet)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onView(snippet)}>
      {snippet.screenshot && (
        <div className="card-screenshot">
          <img src={snippet.screenshot} alt={snippet.title || 'Template'} />
        </div>
      )}
      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{snippet.title || 'Untitled'}</h3>
          <div className="card-actions">
            <button
              className={`btn-icon-small ${snippet.isFavorite ? 'btn-icon-favorite active' : 'btn-icon-favorite'}`}
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              title={snippet.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isTogglingFavorite ? (
                <span className="spinner-small"></span>
              ) : (
                <Star size={18} fill={snippet.isFavorite ? 'currentColor' : 'none'} />
              )}
            </button>
            <button
              className="btn-icon-small btn-icon-danger"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete"
            >
              {isDeleting ? (
                <span className="spinner-small"></span>
              ) : (
                <Trash2 size={18} />
              )}
            </button>
          </div>
        </div>
        {snippet.description && (
          <p className="card-description">{snippet.description}</p>
        )}
        {(snippet.collection || (snippet.tags && snippet.tags.length > 0)) && (
          <div className="card-metadata">
            {snippet.collection && (
              <span className="chip chip-collection">{snippet.collection}</span>
            )}
            {(snippet.tags || []).slice(0, 4).map((tag) => (
              <span className="chip chip-tag" key={`${snippet.id}-${tag}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="card-footer">
          <div className="card-date">
            <Calendar size={14} />
            <span>{formatDate(snippet.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SnippetCard
