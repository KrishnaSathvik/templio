import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FolderTree,
  Layers,
  Lock,
  LogIn,
  Mail,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import Logo from './Logo'
import GradientBlur from './GradientBlur'
import './Auth.css'

function Auth({ onAuthSuccess, onBack }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) throw signUpError

        if (data.user) {
          setMessage(
            'Account created! Please check your email to verify your account.'
          )
          // Auto sign in after signup
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (!signInError && onAuthSuccess) {
            onAuthSuccess()
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        if (onAuthSuccess) {
          onAuthSuccess()
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <GradientBlur />
      <div className="auth-content">
        <div className="auth-top">
          {onBack ? (
            <button
              type="button"
              className="auth-logo-link"
              onClick={onBack}
              aria-label="Go to landing page"
            >
              <Logo />
            </button>
          ) : (
            <div className="auth-logo">
              <Logo />
            </div>
          )}
        </div>

        <div className="auth-shell">
          <aside className="auth-showcase" aria-hidden="true">
            <p className="auth-showcase-badge">
              <Sparkles size={14} />
              Built for modern template workflows
            </p>
            <h1>Ship faster with a clean HTML template vault.</h1>
            <p>
              Capture, categorize, preview, and share production-ready snippets without losing
              structure.
            </p>
            <ul className="auth-showcase-list">
              <li>
                <CheckCircle2 size={16} />
                Global search with filters and pagination
              </li>
              <li>
                <ShieldCheck size={16} />
                Shareable read-only preview links
              </li>
              <li>
                <Layers size={16} />
                AI-assisted title, tags, and collection suggestions
              </li>
            </ul>
          </aside>

          <section className="auth-container">
            <div className="auth-mode-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={!isSignUp}
                className={`auth-mode-tab ${!isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(false)
                  setError(null)
                  setMessage(null)
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignUp}
                className={`auth-mode-tab ${isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(true)
                  setError(null)
                  setMessage(null)
                }}
              >
                Sign Up
              </button>
            </div>

            <div className="auth-header">
              <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
              <p>
                {isSignUp
                  ? 'Start organizing your templates in under a minute.'
                  : 'Sign in to access your template workspace.'}
              </p>
            </div>
            <div className="auth-mobile-benefits" aria-hidden="true">
              <span>Fast import</span>
              <span>AI metadata</span>
              <span>Read-only sharing</span>
            </div>

            {error && <div className="auth-message auth-error">{error}</div>}

            {message && <div className="auth-message auth-success">{message}</div>}

            <form onSubmit={handleAuth} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-shell">
                  <Mail size={16} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-shell">
                  <Lock size={16} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : isSignUp ? (
                  <>
                    <UserPlus size={18} />
                    Create Account
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="auth-footer">
              <button
                type="button"
                className="auth-toggle"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setMessage(null)
                }}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </section>
        </div>

        <section className="auth-mobile-space" aria-hidden="true">
          <h3>After you sign in</h3>
          <div className="auth-mobile-space-grid">
            <article className="auth-mobile-space-card">
              <Search size={15} />
              <div>
                <h4>Find Faster</h4>
                <p>Search templates by title, tags, and collection.</p>
              </div>
            </article>
            <article className="auth-mobile-space-card">
              <FolderTree size={15} />
              <div>
                <h4>Organize Better</h4>
                <p>Auto-group snippets with AI tags and collections.</p>
              </div>
            </article>
            <article className="auth-mobile-space-card">
              <Share2 size={15} />
              <div>
                <h4>Share Safely</h4>
                <p>Create read-only links for public preview.</p>
              </div>
            </article>
          </div>
          <p className="auth-mobile-space-footnote">Private by default. Share only when you choose.</p>
        </section>
      </div>
    </div>
  )
}

export default Auth
