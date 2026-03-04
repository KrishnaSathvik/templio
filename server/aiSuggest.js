const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

const clamp = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '')

const extractJson = (text) => {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first < 0 || last <= first) {
    throw new Error('No JSON payload found in AI response.')
  }
  return JSON.parse(text.slice(first, last + 1))
}

export async function generateAiSuggestion({ htmlCode, apiKey, model = DEFAULT_MODEL }) {
  if (!apiKey) {
    throw new Error('AI assist server is not configured. Missing OPENAI_API_KEY.')
  }

  if (!htmlCode || typeof htmlCode !== 'string') {
    throw new Error('HTML is required.')
  }

  const prompt = `You help organize HTML snippets.
Return ONLY JSON with keys:
- title: concise title under 60 chars
- description: 1-2 sentence summary under 200 chars
- tags: array of 3 to 7 short tags
- collection: one short collection name

HTML:
${htmlCode.slice(0, 12000)}`

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 400,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`OpenAI request failed (${response.status}): ${details.slice(0, 300)}`)
  }

  const payload = await response.json()
  const rawText = payload.output_text || ''
  if (!rawText) {
    throw new Error('AI response was empty.')
  }

  const parsed = extractJson(rawText)
  const tags = Array.isArray(parsed.tags)
    ? Array.from(
        new Set(
          parsed.tags
            .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
            .filter(Boolean)
            .slice(0, 20)
        )
      )
    : []

  return {
    title: clamp(parsed.title, 60).trim(),
    description: clamp(parsed.description, 200).trim(),
    tags,
    collection: clamp(parsed.collection, 80).trim(),
  }
}

