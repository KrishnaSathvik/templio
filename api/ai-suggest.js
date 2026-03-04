import { generateAiSuggestion } from '../server/aiSuggest.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const htmlCode = typeof body.htmlCode === 'string' ? body.htmlCode : ''

    const suggestion = await generateAiSuggestion({
      htmlCode,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    })

    return res.status(200).json(suggestion)
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to generate AI suggestion',
    })
  }
}

