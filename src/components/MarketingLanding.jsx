import {
  ArrowRight,
  Bot,
  FolderTree,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Tags,
} from 'lucide-react'
import Logo from './Logo'
import ThemeSwitcher from './ThemeSwitcher'
import GradientBlur from './GradientBlur'
import './MarketingLanding.css'

const featureCards = [
  {
    icon: Search,
    title: 'Global Search',
    description: 'Find any template instantly with server-side search, filters, and pagination.',
  },
  {
    icon: Tags,
    title: 'Smart Tags',
    description: 'Auto-tag and categorize snippets to keep your library structured.',
  },
  {
    icon: FolderTree,
    title: 'Collections',
    description: 'Group templates by domain, use-case, or project with clean navigation.',
  },
  {
    icon: Share2,
    title: 'Read-only Sharing',
    description: 'Publish secure tokenized links for preview-only sharing.',
  },
  {
    icon: Bot,
    title: 'AI Assist',
    description: 'Generate better titles, metadata, and imports from raw HTML.',
  },
  {
    icon: Smartphone,
    title: 'PWA Ready',
    description: 'Installable experience with offline support and mobile-first flows.',
  },
]

function MarketingLanding({ onGetStarted }) {
  return (
    <div className="landing-page">
      <GradientBlur />

      <header className="landing-header">
        <div className="landing-header-inner">
          <Logo />
          <div className="landing-header-actions">
            <ThemeSwitcher />
            <button type="button" className="landing-signin-btn" onClick={onGetStarted}>
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <p className="landing-eyebrow">
            <ShieldCheck size={14} />
            Template vault for production teams
          </p>
          <h1>Save, organize, preview, and share HTML templates from one workspace.</h1>
          <p className="landing-subtitle">
            Built for fast imports, AI metadata, shareable read-only previews, and scalable template
            search.
          </p>
          <button type="button" className="landing-cta-btn" onClick={onGetStarted}>
            Get Started
            <ArrowRight size={18} />
          </button>
        </section>

        <section className="landing-features" aria-label="Platform features">
          {featureCards.map(({ icon: Icon, title, description }) => (
            <article key={title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon size={18} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

export default MarketingLanding
