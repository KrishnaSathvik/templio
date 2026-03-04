import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

const SHARE_TABLE = 'public_shares'

const isMissingTableError = (error) => {
  if (!error) return false
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')
}

const toSharedSnippet = (row) => ({
  id: String(row.snippet_id),
  title: row.title,
  description: row.description,
  htmlCode: row.html_code,
  screenshot: row.screenshot,
  createdAt: row.created_at,
  isFavorite: false,
  tags: Array.isArray(row.tags) ? row.tags : [],
  collection: row.collection || '',
})

const createToken = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`
}

export const shareService = {
  async getShareBySnippetId(snippetId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from(SHARE_TABLE)
      .select('share_token,expires_at')
      .eq('user_id', session.user.id)
      .eq('snippet_id', snippetId)
      .maybeSingle()

    if (error) {
      if (isMissingTableError(error)) {
        throw new Error('Sharing requires database migration for public_shares table.')
      }
      logger.error('Error loading share by snippet id:', error)
      throw error
    }

    if (!data?.share_token) {
      return null
    }

    return {
      token: data.share_token,
      expiresAt: data.expires_at,
    }
  },

  async createOrUpdateShare(snippet, { expiresInDays = 30 } = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('User not authenticated')

    const token = createToken()
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null

    const payload = {
      user_id: session.user.id,
      snippet_id: Number(snippet.id),
      share_token: token,
      title: snippet.title,
      description: snippet.description || null,
      html_code: snippet.htmlCode,
      screenshot: snippet.screenshot || null,
      tags: Array.isArray(snippet.tags) ? snippet.tags : [],
      collection: snippet.collection || null,
      expires_at: expiresAt,
    }

    const { data, error } = await supabase
      .from(SHARE_TABLE)
      .upsert(payload, { onConflict: 'snippet_id,user_id' })
      .select('share_token,expires_at')
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        throw new Error('Sharing requires database migration for public_shares table.')
      }
      logger.error('Error creating share link:', error)
      throw error
    }

    return {
      token: data.share_token,
      expiresAt: data.expires_at,
    }
  },

  async revokeShare(snippetId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from(SHARE_TABLE)
      .delete()
      .eq('user_id', session.user.id)
      .eq('snippet_id', snippetId)

    if (error) {
      if (isMissingTableError(error)) {
        throw new Error('Sharing requires database migration for public_shares table.')
      }
      logger.error('Error revoking share link:', error)
      throw error
    }
  },

  async getSharedSnippetByToken(token) {
    const { data, error } = await supabase
      .from(SHARE_TABLE)
      .select(
        'snippet_id,title,description,html_code,screenshot,created_at,tags,collection,expires_at'
      )
      .eq('share_token', token)
      .maybeSingle()

    if (error) {
      if (isMissingTableError(error)) {
        throw new Error('Sharing requires database migration for public_shares table.')
      }
      logger.error('Error fetching shared snippet:', error)
      throw error
    }

    if (!data) {
      return null
    }

    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return null
    }

    return toSharedSnippet(data)
  },
}

