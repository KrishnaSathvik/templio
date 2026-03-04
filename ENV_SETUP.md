# Environment Variables Setup

This file documents the required environment variables for the application.

## Required Variables

Create a `.env` file in the project root with the following variables:

```env
# Supabase Configuration
# Get these values from your Supabase project dashboard:
# Settings → API → Project URL and anon/public key

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Server-side AI Assist (secure; do NOT prefix with VITE_)
OPENAI_API_KEY=your-openai-key-here
OPENAI_MODEL=gpt-4.1-mini

# Optional: override AI endpoint in frontend (default: /api/ai-suggest)
VITE_AI_ASSIST_ENDPOINT=/api/ai-suggest

# Optional: used by `pnpm migrate`
DATABASE_URL=postgresql://...
```

## How to Get Your Supabase Credentials

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project (or create a new one)
4. Go to **Settings** → **API**
5. Copy the **Project URL** and **anon/public key**
6. Paste them into your `.env` file

## Important Notes

- The `.env` file is already in `.gitignore` and will not be committed to version control
- Never share your Supabase keys publicly
- Restart your development server after creating or updating the `.env` file
- For production, set these variables in your hosting platform's environment variable settings
- Keep `OPENAI_API_KEY` as a server-only secret (never expose in browser code)

## Troubleshooting

**"Missing Supabase environment variables" error:**
- Make sure your `.env` file exists in the project root
- Verify the variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after creating/updating `.env`
