import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

const SELECT_WITH_METADATA =
  'id,title,description,html_code,screenshot,created_at,is_favorite,tags,collection'
const LEGACY_SELECT =
  'id,title,description,html_code,screenshot,created_at,is_favorite'

const toSnippet = (item) => ({
  id: item.id.toString(),
  title: item.title,
  description: item.description,
  htmlCode: item.html_code,
  screenshot: item.screenshot,
  createdAt: item.created_at,
  isFavorite: item.is_favorite || false,
  tags: Array.isArray(item.tags) ? item.tags : [],
  collection: item.collection || '',
})

const toLegacySnippet = (item) => ({
  ...toSnippet(item),
  tags: [],
  collection: '',
})

const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) return []
  const unique = new Set(
    tags
      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
      .filter(Boolean)
      .slice(0, 20)
  )
  return Array.from(unique)
}

const isMissingColumnError = (error) => {
  if (!error) return false
  return error.code === '42703' || /column .* does not exist/i.test(error.message || '')
}

const applyFilters = (query, { userId, favoritesOnly, search, collection, tag, supportsMetadata }) => {
  let nextQuery = query.eq('user_id', userId)

  if (favoritesOnly) {
    nextQuery = nextQuery.eq('is_favorite', true)
  }

  if (search?.trim()) {
    const escaped = search.trim().replace(/,/g, '\\,')
    nextQuery = nextQuery.or(
      `title.ilike.%${escaped}%,description.ilike.%${escaped}%,html_code.ilike.%${escaped}%`
    )
  }

  if (supportsMetadata && collection?.trim()) {
    nextQuery = nextQuery.eq('collection', collection.trim())
  }

  if (supportsMetadata && tag?.trim()) {
    nextQuery = nextQuery.contains('tags', [tag.trim()])
  }

  return nextQuery
}

export const snippetsService = {
  async getAllForMaintenance() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return []

    const user = session.user

    const advanced = await supabase
      .from('snippets')
      .select(SELECT_WITH_METADATA)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!advanced.error) {
      return (advanced.data || []).map(toSnippet)
    }

    if (!isMissingColumnError(advanced.error)) {
      logger.error('Error fetching snippets for maintenance:', advanced.error)
      return []
    }

    const legacy = await supabase
      .from('snippets')
      .select(LEGACY_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (legacy.error) {
      logger.error('Error fetching snippets for maintenance (legacy fallback):', legacy.error)
      return []
    }

    return (legacy.data || []).map(toLegacySnippet)
  },

  // Get paginated snippets for the current user
  async getPage({
    page = 1,
    pageSize = 6,
    sort = 'newest',
    favoritesOnly = false,
    search = '',
    tag = '',
    collection = '',
  } = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { data: [], totalCount: 0 }

    const user = session.user
    const from = Math.max((page - 1) * pageSize, 0)
    const to = from + pageSize - 1
    const ascending = sort === 'oldest'

    const baseAdvanced = supabase
      .from('snippets')
      .select(SELECT_WITH_METADATA, { count: 'exact' })

    const advancedQuery = applyFilters(baseAdvanced, {
      userId: user.id,
      favoritesOnly,
      search,
      collection,
      tag,
      supportsMetadata: true,
    })
      .order('created_at', { ascending })
      .range(from, to)

    const advancedResult = await advancedQuery

    if (advancedResult.error && !isMissingColumnError(advancedResult.error)) {
      logger.error('Error fetching paginated snippets:', advancedResult.error)
      return { data: [], totalCount: 0 }
    }

    if (!advancedResult.error) {
      return {
        data: (advancedResult.data || []).map(toSnippet),
        totalCount: advancedResult.count || 0,
      }
    }

    const baseLegacy = supabase
      .from('snippets')
      .select(LEGACY_SELECT, { count: 'exact' })

    const legacyQuery = applyFilters(baseLegacy, {
      userId: user.id,
      favoritesOnly,
      search,
      collection: '',
      tag: '',
      supportsMetadata: false,
    })
      .order('created_at', { ascending })
      .range(from, to)

    const legacyResult = await legacyQuery

    if (legacyResult.error) {
      logger.error('Error fetching paginated snippets (legacy fallback):', legacyResult.error)
      return { data: [], totalCount: 0 }
    }

    return {
      data: (legacyResult.data || []).map(toLegacySnippet),
      totalCount: legacyResult.count || 0,
    }
  },

  async getFilterMetadata() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { collections: [], tags: [] }

    const user = session.user

    const { data, error } = await supabase
      .from('snippets')
      .select('collection,tags')
      .eq('user_id', user.id)
      .limit(1000)

    if (error) {
      if (!isMissingColumnError(error)) {
        logger.error('Error fetching filter metadata:', error)
      }
      return { collections: [], tags: [] }
    }

    const collectionsSet = new Set()
    const tagsSet = new Set()

    for (const row of data || []) {
      if (row.collection && typeof row.collection === 'string') {
        collectionsSet.add(row.collection.trim())
      }
      if (Array.isArray(row.tags)) {
        row.tags.forEach((tag) => {
          if (typeof tag === 'string' && tag.trim()) {
            tagsSet.add(tag.trim())
          }
        })
      }
    }

    return {
      collections: Array.from(collectionsSet).sort((a, b) => a.localeCompare(b)),
      tags: Array.from(tagsSet).sort((a, b) => a.localeCompare(b)),
    }
  },

  async getById(id) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    const user = session.user

    const advanced = await supabase
      .from('snippets')
      .select(SELECT_WITH_METADATA)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!advanced.error) {
      return toSnippet(advanced.data)
    }

    if (!isMissingColumnError(advanced.error)) {
      logger.error('Error fetching snippet by id:', advanced.error)
      return null
    }

    const legacy = await supabase
      .from('snippets')
      .select(LEGACY_SELECT)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (legacy.error) {
      logger.error('Error fetching snippet by id (legacy fallback):', legacy.error)
      return null
    }

    return toLegacySnippet(legacy.data)
  },

  async getAnalyticsCounts() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return { totalSnippets: 0, favoritesCount: 0, createdThisWeek: 0 }
    }

    const userId = session.user.id
    const weekAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [totalResult, favoritesResult, weeklyResult] = await Promise.all([
      supabase.from('snippets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('snippets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_favorite', true),
      supabase
        .from('snippets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekAgoISO),
    ])

    if (totalResult.error) logger.error('Error loading total snippet count:', totalResult.error)
    if (favoritesResult.error) logger.error('Error loading favorites count:', favoritesResult.error)
    if (weeklyResult.error) logger.error('Error loading weekly snippet count:', weeklyResult.error)

    return {
      totalSnippets: totalResult.count || 0,
      favoritesCount: favoritesResult.count || 0,
      createdThisWeek: weeklyResult.count || 0,
    }
  },

  // Create a new snippet
  async create(snippet) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('User not authenticated')
    
    const user = session.user

    // Log screenshot info for debugging
    if (snippet.screenshot) {
      logger.log('Saving snippet with screenshot, size:', snippet.screenshot.length, 'bytes')
    } else {
      logger.warn('Saving snippet without screenshot')
    }

    const advancedPayload = {
      user_id: user.id,
      title: snippet.title,
      description: snippet.description || null,
      html_code: snippet.htmlCode,
      screenshot: snippet.screenshot || null,
      is_favorite: snippet.isFavorite || false,
      collection: snippet.collection?.trim() || null,
      tags: sanitizeTags(snippet.tags),
    }

    let { data, error } = await supabase
      .from('snippets')
      .insert([advancedPayload])
      .select(SELECT_WITH_METADATA)
      .single()

    if (error && isMissingColumnError(error)) {
      const legacyPayload = {
        user_id: user.id,
        title: snippet.title,
        description: snippet.description || null,
        html_code: snippet.htmlCode,
        screenshot: snippet.screenshot || null,
        is_favorite: snippet.isFavorite || false,
      }

      const legacyInsert = await supabase
        .from('snippets')
        .insert([legacyPayload])
        .select(LEGACY_SELECT)
        .single()

      data = legacyInsert.data
      error = legacyInsert.error
    }

    if (error) {
      logger.error('Error creating snippet:', error)
      if (error.message && error.message.includes('value too long')) {
        logger.error('Screenshot data URL is too large for database field')
      }
      throw error
    }

    // Verify screenshot was saved
    if (snippet.screenshot && !data.screenshot) {
      logger.warn('Warning: Screenshot was provided but not saved to database')
    } else if (data.screenshot) {
      logger.log('Screenshot saved successfully')
    }

    return toSnippet(data)
  },

  // Update a snippet
  async update(snippet) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('User not authenticated')
    
    const user = session.user

    const advancedPayload = {
      title: snippet.title,
      description: snippet.description || null,
      html_code: snippet.htmlCode,
      screenshot: snippet.screenshot || null,
      is_favorite: snippet.isFavorite !== undefined ? snippet.isFavorite : false,
      collection: snippet.collection?.trim() || null,
      tags: sanitizeTags(snippet.tags),
    }

    let { data, error } = await supabase
      .from('snippets')
      .update(advancedPayload)
      .eq('id', snippet.id)
      .eq('user_id', user.id)
      .select(SELECT_WITH_METADATA)
      .single()

    if (error && isMissingColumnError(error)) {
      const legacyPayload = {
        title: snippet.title,
        description: snippet.description || null,
        html_code: snippet.htmlCode,
        screenshot: snippet.screenshot || null,
        is_favorite: snippet.isFavorite !== undefined ? snippet.isFavorite : false,
      }

      const legacyUpdate = await supabase
        .from('snippets')
        .update(legacyPayload)
        .eq('id', snippet.id)
        .eq('user_id', user.id)
        .select(LEGACY_SELECT)
        .single()

      data = legacyUpdate.data
      error = legacyUpdate.error
    }

    if (error) {
      logger.error('Error updating snippet:', error)
      throw error
    }

    return toSnippet(data)
  },

  // Toggle favorite status
  async toggleFavorite(id, isFavorite) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('User not authenticated')
    
    const user = session.user

    const { data, error } = await supabase
      .from('snippets')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error toggling favorite:', error)
      throw error
    }

    return toSnippet(data)
  },

  // Delete a snippet
  async delete(id) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('User not authenticated')
    
    const user = session.user

    const { error } = await supabase
      .from('snippets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error deleting snippet:', error)
      throw error
    }
  },
}
