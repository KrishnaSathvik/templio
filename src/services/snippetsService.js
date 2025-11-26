import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export const snippetsService = {
  // Get all snippets for the current user
  async getAll() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return []
    
    const user = session.user

    const { data, error } = await supabase
      .from('snippets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching snippets:', error)
      return []
    }

    // Map database fields to component format
    return (data || []).map((item) => ({
      id: item.id.toString(),
      title: item.title,
      description: item.description,
      htmlCode: item.html_code,
      screenshot: item.screenshot,
      createdAt: item.created_at,
      isFavorite: item.is_favorite || false,
    }))
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

    const { data, error } = await supabase
      .from('snippets')
      .insert([
        {
          user_id: user.id,
          title: snippet.title,
          description: snippet.description || null,
          html_code: snippet.htmlCode,
          screenshot: snippet.screenshot || null,
          is_favorite: snippet.isFavorite || false,
        },
      ])
      .select()
      .single()

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

    return {
      id: data.id.toString(),
      title: data.title,
      description: data.description,
      htmlCode: data.html_code,
      screenshot: data.screenshot,
      createdAt: data.created_at,
    }
  },

  // Update a snippet
  async update(snippet) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('User not authenticated')
    
    const user = session.user

    const { data, error } = await supabase
      .from('snippets')
      .update({
        title: snippet.title,
        description: snippet.description || null,
        html_code: snippet.htmlCode,
        screenshot: snippet.screenshot || null,
        is_favorite: snippet.isFavorite !== undefined ? snippet.isFavorite : false,
      })
      .eq('id', snippet.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating snippet:', error)
      throw error
    }

    return {
      id: data.id.toString(),
      title: data.title,
      description: data.description,
      htmlCode: data.html_code,
      screenshot: data.screenshot,
      createdAt: data.created_at,
      isFavorite: data.is_favorite || false,
    }
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

    return {
      id: data.id.toString(),
      title: data.title,
      description: data.description,
      htmlCode: data.html_code,
      screenshot: data.screenshot,
      createdAt: data.created_at,
      isFavorite: data.is_favorite || false,
    }
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

