const AI_ENDPOINT = import.meta.env.VITE_AI_ASSIST_ENDPOINT || '/api/ai-suggest'

export const isAIAssistConfigured = () => true

export async function suggestSnippetMetadata(htmlCode) {
  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ htmlCode }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `AI request failed (${response.status}).`)
  }

  return {
    title: typeof payload.title === 'string' ? payload.title.trim() : '',
    description: typeof payload.description === 'string' ? payload.description.trim() : '',
    tags: Array.isArray(payload.tags)
      ? payload.tags
          .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(Boolean)
          .slice(0, 20)
      : [],
    collection: typeof payload.collection === 'string' ? payload.collection.trim() : '',
  }
}

