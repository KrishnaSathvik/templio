# Project Analysis And Roadmap

## 1) Current Product Snapshot

Templio is a React + Vite web app for authenticated users to save HTML templates/snippets in Supabase, auto-generate screenshots, browse templates in a card grid, and open each template in a full-screen preview/code detail view.

Core stack found in code:
- Frontend: React 18, Vite 5
- Backend services: Supabase Auth + Postgres
- Utilities: html2canvas, Prism, react-simple-code-editor, DOMPurify

## 2) Current Features (From Existing Files)

### Authentication and Session
- Email/password sign up + sign in (`src/components/Auth.jsx`)
- Session persistence and auth state handling (`src/App.jsx`, `src/lib/supabase.js`)
- Sign out support (`src/App.jsx`)

### Template Management
- Create template with title, description, HTML (`src/components/AddSnippetForm.jsx`)
- Auto screenshot generation during create flow (`src/components/AddSnippetForm.jsx`)
- List templates from Supabase by current user (`src/services/snippetsService.js`)
- Delete template with confirmation modal (`src/components/ConfirmDialog.jsx`, `src/App.jsx`)
- Update path exists in service for title/description/html/screenshot/favorite (`src/services/snippetsService.js`)
- UI currently edits title only in detail page (`src/components/SnippetDetail.jsx`)

### Browsing and Organization
- Grid cards with screenshot/title/date (`src/components/SnippetCard.jsx`)
- Favorite toggle (`src/components/SnippetCard.jsx`, `src/App.jsx`)
- Filtering: newest, oldest, favorites (`src/App.jsx`)
- Client-side pagination (6 items/page) (`src/App.jsx`)
- URL-driven detail state (`?snippet=...&view=...`) with back/forward behavior (`src/App.jsx`, `src/components/SnippetDetail.jsx`)

### Viewing and Developer Workflow
- Full-screen preview in sandboxed iframe (`src/components/SnippetDetail.jsx`)
- Read-only code view with syntax highlight + line numbers + copy (`src/components/SnippetDetail.jsx`)
- Theme switcher (light/dark/system) with persistence (`src/contexts/ThemeContext.jsx`)
- Toast notifications for actions/errors (`src/contexts/ToastContext.jsx`, `src/components/Toast.jsx`)
- Global error boundary (`src/components/ErrorBoundary.jsx`)

### Security/Platform Utilities
- Input checks for title/description/HTML size (`src/utils/validation.js`)
- HTTPS redirect helper for production (`src/utils/httpsEnforcement.js`)
- Development-only logging wrapper (`src/utils/logger.js`)

## 3) Gaps and Improvement Opportunities

### P0: High Impact / Should Prioritize First

1. Preview security hardening
- Current preview renders unsanitized HTML and allows scripts in iframe.
- `validateAndSanitizeHTML` exists but is not enforced in save/preview path.
- Recommendation: add a strict preview mode by default (no scripts), and an explicit "Run JS" toggle with warning.

2. Screenshot architecture
- Screenshots are stored as base64 text in database rows, which will bloat table size and slow reads.
- Recommendation: move screenshots to Supabase Storage, keep only URL/path in `snippets` table.

3. Multi-user cache isolation
- Local cache key is global (`snippets_cache`), not user-scoped.
- Recommendation: key cache by user ID (for example `snippets_cache_<userId>`) and clear on account switch.

4. Setup documentation inconsistency
- `SUPABASE_SETUP.md` creates index `idx_snippets_is_favorite` before ensuring `is_favorite` exists in initial table SQL.
- Recommendation: include `is_favorite BOOLEAN DEFAULT false` in initial `CREATE TABLE` statement to avoid SQL errors.

### P1: Product and Scale Improvements

1. Server-side pagination, filtering, and search
- Current app fetches all snippets then filters/pages client-side.
- Recommendation: query with limit/offset/cursor and add search on title/description (and optional full-text search).

2. Full template editing UI
- Service supports full update but UI edits title only.
- Recommendation: add "Edit template" mode for HTML + description with preview-before-save.

3. Better observability
- No production telemetry/error tracking integration.
- Recommendation: add Sentry (or similar) + structured event logging for create/delete/update failures.

4. Reliability for screenshot generation
- Add cancellation, clearer timeout messaging, and retry path when external assets fail.

### P2: UX/Polish/Quality

1. Accessibility pass
- Improve keyboard navigation, focus trapping in modals, `aria-live` for toasts, and better semantic announcements.

2. PWA completeness
- `site.webmanifest` currently has empty `name` and `short_name`.
- Add valid values + service worker for offline shell caching.

3. Test coverage
- No unit/E2E test setup currently.
- Add React Testing Library for components and Playwright for critical flows.

## 4) New Features To Implement

### Highest-Value New Features

1. Global search
- Search by title, description, and optionally HTML content.
- Add debounced input and server-side query support.

2. Tags and collections
- Add tags table and many-to-many relation with snippets.
- Enable tag filter chips and saved collections/folders.

3. Import/export
- Export all snippets as JSON, single snippet as `.html`.
- Import with validation + conflict handling.

4. Version history
- Store revision snapshots on update.
- UI diff view and one-click restore.

5. Shareable read-only links
- Public tokenized URL for a snippet (opt-in per snippet).
- Scope permissions and expiration options.

### Advanced Features (After Core Maturity)

1. AI assist
- Generate description/title from HTML.
- "Improve this HTML" suggestion workflow.

2. Team collaboration
- Shared workspaces, member roles, comments, and audit trail.

3. Snippet analytics
- View usage, favorites over time, and recently viewed templates.

## 5) Recommended Delivery Plan

### Phase 1 (1-2 weeks)
- Harden preview security and add JS toggle mode.
- Move screenshot storage to Supabase Storage.
- Fix user-scoped cache and setup SQL docs.

### Phase 2 (1-2 weeks)
- Add server-side pagination/filter/search.
- Build full edit flow for description + HTML.
- Add monitoring and error tracking.

### Phase 3 (2-3 weeks)
- Add tags, import/export, and version history.
- Add initial test suite (unit + E2E smoke).

## 6) Quick Wins You Can Do Immediately

- Fill manifest `name`/`short_name` values.
- Add user-scoped cache key.
- Update setup SQL to include `is_favorite` at table creation.
- Add basic search input with client filtering now, then move to server query later.
- Add a feature flag for "unsafe JS preview" and keep safe mode as default.
