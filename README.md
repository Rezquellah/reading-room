# Reading Room 2.0

A private language library for reading, reflection, and long-term memory. Warm editorial typography, book shelves, structured rich notes, vocabulary, real FSRS review, and practical learning actions.

## Run on Windows

Install Node.js 22+ and pnpm 11. In PowerShell:

```powershell
pnpm install
Copy-Item .env.example .env.local
# Add the Supabase project URL and publishable key to .env.local.
pnpm dev
```

Open http://localhost:3000. Create an account, confirm the email, then sign in. Create a language workspace before adding reading. Public sample content is explicitly labeled and is never inserted into an account.

## Architecture

- Next.js 16 App Router, React 19, strict TypeScript 6 (compatible with typescript-eslint), Tailwind 4, Radix dialogs, Lucide icons.
- Supabase SSR cookie sessions, server-validated authentication, PostgreSQL, private Storage.
- Tiptap 3 JSON documents with formatting, headings, tables, image uploads/resizing, checklists, document search, focus mode, and learning templates.
- ts-fsrs 5 for scheduling, with serialized state and atomic review history writes.
- Chromium/Puppeteer PDF rendering with embedded images, French characters, A4/Letter, page numbering, and ink-friendly output. Windows uses installed Microsoft Edge; override `CHROME_EXECUTABLE_PATH` if needed. Vercel uses bundled Linux Chromium.

`workspaces` own language context. `entries` stores typed books, articles, chapters, notes, vocabulary, quotations, cards, journal entries, and actions. Composite foreign keys enforce owner/workspace relationships. Triggers enforce valid, acyclic source types. `review_logs` records recall events. `uploaded_assets` tracks private files. Flexible type-specific metadata lives in JSONB; relationships remain relational.

All API routes check the authenticated user and use their session, never a service-role key. RLS independently enforces ownership. Updates require the previous timestamp; stale writes fail. Review state and history commit together. Autosave is serialized, shows failures, and keeps an unsynced device draft for recovery. Device drafts are a safety copy, not the primary database.

## Supabase setup

The new 2.0 project reference is `nfvzozcegfnmqlhkkbgg` (West EU/Ireland). Apply numbered SQL files in `supabase/migrations` in order, once, to a **new** project. The first two migrations were applied through the dashboard in this session. Do not reset a production database.

Authentication → URL Configuration must include the deployed origin as Site URL, `https://YOUR-DOMAIN/auth/callback`, `https://YOUR-DOMAIN/auth/callback?next=/password`, and corresponding localhost URLs for development. Keep email confirmation enabled. The private `reading-assets` bucket accepts JPEG, PNG, WebP, and GIF up to 5 MB; uploads are served only to their owner.

## Existing Reading Room version

This branch descends from the existing `Rezquellah/reading-room` history. Its `main` branch, existing deployment, and old Supabase project are preserved. Version 2.0 uses a separate Supabase project and schema; changing the old production project's environment variables would disconnect its old content. **Do not point this branch at the old database or automatically replace that deployment.** The old source remains available in Git history at `2962e72`.

The 1.0 JSON format (`records` / `review_events`) is different from the 2.0 backup format. Direct 1.0 import is not yet supported. Keep a 1.0 export and the original database before migrating existing content.

## Validation

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Unit tests cover progress, Unicode indexing, input validation, and FSRS date serialization. PGlite executes the actual SQL migrations to verify RLS isolation, relationship validation, stale review conflicts, and atomic duplicate-safe restore. Playwright uses a loopback-only Supabase facade with **simulated authentication** and real SQL/RLS, server APIs, editor, and PDF renderer. This does not verify Supabase email delivery or real production login. Windows tests use Edge; on Linux install Chromium with `pnpm exec playwright install chromium`. The test harness uses ports 3001 and 9999 and never writes production data.

## Backups and maintenance

Settings → Download JSON backup exports all owned workspaces, entries, and review logs from the database. Restore previews counts and requires confirmation; it skips existing IDs and performs the entire restore transactionally. Invalid relationships roll back the import. Current HTTP import limit is 3.5 MB. JSON exports contain image references; separately back up Supabase Storage objects to preserve the image bytes. Existing objects are not automatically deleted when a note is removed, protecting references from other notes.

Commit SQL migrations with schema changes. Run checks before pushing. Configure Vercel with the two public Supabase variables from `.env.example`, Node.js 22+, and `pnpm build`. Deploy a preview first, verify it, then promote to production. Git deployments should track the chosen 2.0 branch. Never commit `.env.local`, database passwords, or privileged tokens.

## Current boundaries

- English UI with French navigation/date formatting; comprehensive French translation remains unfinished.
- Article metadata and vocabulary definitions are manual. No scraping or paywall bypass.
- Chapter order is edited through its number; no drag-and-drop reorder yet.
- No contextual selection bubble, slash commands, dedicated image caption fields, or related-note graph yet.
- Search scans loaded owned content; dedicated server-side ranked full-text search and date filters remain future work.
- Review counts/history are real; advanced retention charts, reading activity history, and goal analytics are not implemented yet.
- No automatic merge of concurrent edits. Recover a failed device draft and reconcile it with the saved version.
- Live signup, recovery emails, storage isolation, and production PDF rendering must be checked against the deployed environment before calling the application production-verified.
