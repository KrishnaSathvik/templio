# Templio

**Save, organize, preview, and share HTML templates in the cloud.**

Templio is a React + Supabase app for managing HTML snippets/templates with screenshot generation, server-side search/filter/pagination, AI-assisted metadata, and shareable read-only links.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![React](https://img.shields.io/badge/React-18.2-blue)
![Vite](https://img.shields.io/badge/Vite-5.x-purple)
![Supabase](https://img.shields.io/badge/Supabase-2.x-green)

## What Is Implemented

### Core Template Management
- Save HTML templates with title/description.
- Automatic screenshot generation (with retries/fallback behavior).
- Favorites toggle.
- Server-side pagination (6 per page).
- Server-side search and filtering:
  - Search by title, description, and HTML content.
  - Filter by favorites.
  - Filter by collection and tag.
  - Sort newest/oldest.
- Inline title editing in detail view.
- Copy code and delete with confirmation.

### Import + Metadata Automation
- Import one or multiple `.html` files directly from the Add Template form.
- Multi-file import progress and success/failure handling.
- HTML cleanup to remove dev runtime artifacts before save/preview.
- Automatic title resolution during import (no manual post-fix step needed):
  1. AI title (if valid)
  2. HTML-derived title (`<title>`, meta title, `h1`)
  3. Non-generic filename
  4. Fallback imported title
- Automatic collection/tags assignment when missing:
  - AI suggestion first
  - Fallback to `General` + `general`

### Sharing (Public Read-Only)
- Create/revoke public tokenized share links per snippet.
- Shared links render in read-only mode.
- Shared links open directly in template preview mode.
- Shared preview includes a visible **Shared Preview • Read-only link** indicator.

### Preview Experience
- Full preview mode (scripts allowed) for realistic rendering.
- Optional Safe Preview mode (sanitized scripts blocked).
- Read-only code view with syntax highlighting and line numbers.

### Landing + Auth UX
- Public marketing/landing page for logged-out users.
- Get Started flow into auth.
- Auth redesign with improved mobile-first layout.
- Mobile viewport/input behavior tuned to avoid zoom-jumps and layout shifting.

### PWA + Runtime Reliability
- Service worker + manifest for installable PWA behavior.
- Offline fallback behavior for navigations.
- In development, stale service workers/caches are unregistered/cleared to avoid HMR breakage.

### Security + Production Hardening
- Supabase auth + RLS-backed data isolation.
- Input validation and HTML sanitization.
- HTTPS enforcement utility in production.
- AI key remains server-side via backend endpoint.

## Recent Work Included

This repository now includes major product and infrastructure updates:
- Server-side pagination/filter/search.
- Public share-link system (`public_shares`) and read-only route handling.
- Import automation (title cleanup + auto metadata + batch import).
- Marketing landing page + improved auth/mobile UX.
- PWA/service worker completeness.
- Secure AI-assist flow via `/api/ai-suggest`.
- Migration runner + SQL migrations for schema setup.

See also: [PROJECT_ANALYSIS_AND_ROADMAP.md](./PROJECT_ANALYSIS_AND_ROADMAP.md)

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Supabase project
- `psql` (for `pnpm migrate`)

### 1) Install

```bash
git clone https://github.com/KrishnaSathvik/templio.git
cd templio
pnpm install
```

### 2) Configure Environment

Create `.env` in project root:

```env
# Required (frontend)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Required for AI assist (server-side)
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4.1-mini

# Optional frontend override
VITE_AI_ASSIST_ENDPOINT=/api/ai-suggest

# Required for migrations
DATABASE_URL=postgresql://postgres:password@db.<project-ref>.supabase.co:5432/postgres
```

More details: [ENV_SETUP.md](./ENV_SETUP.md)

### 3) Run Database Migrations

```bash
pnpm migrate
```

This applies all SQL files in `migrations/`.

### 4) Start Dev Server

```bash
pnpm dev
```

Open `http://localhost:5173`.

## Scripts

```bash
pnpm dev      # run Vite dev server
pnpm build    # production build
pnpm preview  # preview production build
pnpm migrate  # apply SQL migrations using DATABASE_URL
```

## Database

Migrations included:
- `migrations/001_snippets.sql` (snippets schema, RLS, indexes, trigram search index)
- `migrations/002_public_shares.sql` (public share table + policies + indexes)

You can also follow the step-by-step guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Deployment

Vercel deployment guide: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

Required production env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Project Structure

```text
templio/
├── api/                      # Serverless endpoints (e.g. AI assist)
├── migrations/               # SQL migrations
├── public/                   # Static assets, manifest, service worker
├── scripts/                  # Helper scripts (migration runner)
├── server/                   # Shared server-side logic
├── src/
│   ├── components/
│   │   ├── MarketingLanding.jsx
│   │   ├── Auth.jsx
│   │   ├── AddSnippetForm.jsx
│   │   ├── SnippetCard.jsx
│   │   ├── SnippetDetail.jsx
│   │   ├── ConfirmDialog.jsx
│   │   └── Toast.jsx
│   ├── contexts/
│   ├── lib/
│   ├── services/
│   │   ├── snippetsService.js
│   │   └── shareService.js
│   ├── utils/
│   │   ├── aiAssist.js
│   │   ├── analytics.js
│   │   ├── htmlCleanup.js
│   │   ├── imageProxy.js
│   │   ├── httpsEnforcement.js
│   │   └── validation.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── ENV_SETUP.md
├── SUPABASE_SETUP.md
├── VERCEL_DEPLOYMENT.md
└── PROJECT_ANALYSIS_AND_ROADMAP.md
```

## Documentation

- [ENV_SETUP.md](./ENV_SETUP.md)
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- [PROJECT_ANALYSIS_AND_ROADMAP.md](./PROJECT_ANALYSIS_AND_ROADMAP.md)
- [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md)
- [CRITICAL_FIXES_SUMMARY.md](./CRITICAL_FIXES_SUMMARY.md)

## License

Private/proprietary project.
