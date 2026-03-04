import { Activity, BarChart3, Copy, Eye, Star, Tags } from 'lucide-react'
import './SnippetAnalytics.css'

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="analytics-card">
      <div className="analytics-card-icon">
        <Icon size={18} />
      </div>
      <div className="analytics-card-text">
        <span className="analytics-card-label">{label}</span>
        <strong className="analytics-card-value">{value}</strong>
      </div>
    </div>
  )
}

function SnippetAnalytics({ summary }) {
  if (!summary) return null

  return (
    <section className="analytics-section" aria-label="Snippet analytics">
      <div className="analytics-header">
        <h2>
          <BarChart3 size={18} />
          Snippet Analytics
        </h2>
      </div>
      <div className="analytics-grid">
        <StatCard icon={Activity} label="Total Snippets" value={summary.totalSnippets} />
        <StatCard icon={Star} label="Favorites" value={summary.favoritesCount} />
        <StatCard icon={Tags} label="Unique Tags" value={summary.uniqueTagsCount} />
        <StatCard icon={Eye} label="Views" value={summary.totalViews} />
        <StatCard icon={Copy} label="Copies" value={summary.totalCopies} />
      </div>
      {summary.mostViewed && (
        <p className="analytics-highlight">
          Most viewed: <strong>{summary.mostViewed.snippet.title}</strong> ({summary.mostViewed.count}{' '}
          views)
        </p>
      )}
    </section>
  )
}

export default SnippetAnalytics

