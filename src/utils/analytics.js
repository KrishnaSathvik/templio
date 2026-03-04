const STORAGE_KEY = 'templio_analytics'

const defaultState = {
  viewed: {},
  copied: {},
  shared: {},
}

const safeRead = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultState }
    const parsed = JSON.parse(raw)
    return {
      viewed: parsed?.viewed || {},
      copied: parsed?.copied || {},
      shared: parsed?.shared || {},
    }
  } catch {
    return { ...defaultState }
  }
}

const safeWrite = (next) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

const bump = (bucket, snippetId) => {
  if (!snippetId) return
  const state = safeRead()
  const key = String(snippetId)
  state[bucket][key] = (state[bucket][key] || 0) + 1
  safeWrite(state)
}

const sumValues = (obj) => Object.values(obj || {}).reduce((acc, value) => acc + Number(value || 0), 0)

const topByCount = (bucket, snippets) => {
  const entries = Object.entries(bucket || {})
  if (entries.length === 0) return null
  entries.sort((a, b) => Number(b[1]) - Number(a[1]))
  const [snippetId, count] = entries[0]
  const snippet = snippets.find((item) => item.id === snippetId)
  return snippet ? { snippet, count: Number(count) } : null
}

export const analytics = {
  trackView(snippetId) {
    bump('viewed', snippetId)
  },

  trackCopy(snippetId) {
    bump('copied', snippetId)
  },

  trackShare(snippetId) {
    bump('shared', snippetId)
  },

  getSummary(snippets) {
    const state = safeRead()
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const createdThisWeek = snippets.filter(
      (snippet) => snippet.createdAt && new Date(snippet.createdAt).getTime() >= weekAgo
    ).length

    const uniqueTags = new Set()
    snippets.forEach((snippet) => {
      ;(snippet.tags || []).forEach((tag) => uniqueTags.add(tag))
    })

    return {
      totalSnippets: snippets.length,
      favoritesCount: snippets.filter((snippet) => snippet.isFavorite).length,
      createdThisWeek,
      uniqueTagsCount: uniqueTags.size,
      totalViews: sumValues(state.viewed),
      totalCopies: sumValues(state.copied),
      totalShares: sumValues(state.shared),
      mostViewed: topByCount(state.viewed, snippets),
    }
  },
}

