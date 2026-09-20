# Reading Room

A private, bilingual learning workspace for books, articles, vocabulary, recall, and real-world practice. This is a working Next.js application with Supabase persistence, not a localStorage demo. No AI key is required.

## Start here (one-time setup)

### This workspace's setup status

Live website: **[Reading Room](https://reading-room-silk.vercel.app)**. Vercel is connected to the private repository's `main` branch, with both Supabase environment variables configured for Production and Preview. The initial cloud production build succeeded. Supabase's Site URL is set to the live HTTPS address, and the deployed dashboard and account dialog were checked in a browser. Create your own account on the live site, confirm the email, and sign in. Password entry is left to the account owner. Signed-in production workflows and production PDF downloads still require that account.

The private repository is [Rezquellah/reading-room](https://github.com/Rezquellah/reading-room). Supabase project `oseyotfouanfznjnzils` has migration `001_reading_room.sql` applied, with both tables protected by RLS. This computer's ignored `.env.local` contains the public connection settings. Email/password signup and email confirmation are enabled. The live database passed owner save/read, French text, cross-user read/update/export isolation and invalid source-link checks in a transaction that was rolled back; no test accounts or notes were retained. Real email signup/login and deployed PDF verification are still pending.

The steps below explain how to configure another checkout or deployment. Do not re-run the initial migration on the already-configured database.

1. Install Node.js 22 LTS or newer. Open a terminal in this folder and run `npm ci`.
2. Create a project at [Supabase](https://supabase.com/dashboard). Keep your database password in your password manager; the app does not need it.
3. In Supabase, open **SQL Editor → New query**. Paste the entire contents of `supabase/migrations/001_reading_room.sql`, then click **Run**. Run it once in a new project. It creates the tables, private-data policies, and atomic save/review/import functions.
4. In **Project Settings → API / API Keys**, copy your project URL and **publishable key**. Do not use the secret or service-role key.
5. Copy `.env.example` to `.env.local`. Replace its two placeholder values:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

6. In Supabase **Authentication → URL Configuration**, set the site URL to `http://localhost:3000` while developing. Email/password sign-in must be enabled. Keep email confirmation enabled; new users confirm their email and then sign in with their password. There is no OAuth provider to configure.
7. Run `npm run dev` and open [Reading Room](http://localhost:3000). Click **Sign in → Create account**. Confirm your email if prompted, then sign in.

Without the two environment values, the app displays a setup state and blocks data entry. It never pretends to save to an unconnected database. Only theme and interface-language preferences use browser storage.

## Using your room

- **Add book / Add article:** only the title is required. Open an entry to edit its details or learning goal. Chapters have an editable number/order and a separate completion status.
- **Notes:** open **Edit**, paste a ChatGPT explanation into **Quick paste**, or expand individual structured sections. Click **Save** and wait for **Saved**. Saving is explicit, not automatic. Failed requests preserve your draft; closing an unsaved form or leaving the page warns you.
- **Vocabulary:** add a word from a chapter/article to retain its source, or add it from the Vocabulary page. Definitions are manual. Duplicate warnings do not block distinct meanings. Open a word to create forward, reverse, or supplied sentence-completion cards.
- **Recall:** deliberately create a question from an entry or a particular saved note. Edit the question and answer before saving. Review hides the answer until you reveal it; rate your recall to schedule the next review. Cards can be paused.
- **Practice:** add an action and context, then move it through Planned, Tried, and Reflected while recording the outcome. Reading completion and recall are separate.
- **PDF:** open a saved entry and choose **Export PDF**. For books, select chapters; for vocabulary, select words first. Choose the sections to include, including reflections and recall answers. Download starts only after generation completes. Exports always use the server's saved data.
- **Trash:** the trash icon on an entry moves it to recoverable trash. Open Library's trash button to restore it. Descendants remain saved and reappear when their parent is restored. There is no permanent-delete UI.
- **Backups:** Settings provides a complete JSON export, including review history and trash. Import shows a preview and skips existing record IDs, leaving existing content untouched. It runs atomically: any invalid relationship rolls back the entire import. To restore an older version of an existing ID, use a separate fresh database; this importer intentionally does not overwrite current records. Identical content with different IDs is treated as distinct content.

### Concurrent edits

Every content write includes the version that was opened. PostgreSQL rejects stale versions rather than overwriting newer content. Keep the failed editor open, copy any text you need, and reload the saved record before reconciling. Saving is serialized within an editor; controls are disabled during a request. Failed drafts remain in memory, not a cloud backup; do not force-close the browser before saving or copying them.

### Review schedule

The deterministic schedule uses the previous interval in whole days:

| Rating | Next interval |
| --- | --- |
| Again | 10 minutes; reset interval to 0 |
| Hard | round(previous × 1.2), minimum 1 day |
| Good | round(previous × 2.5), minimum 2 days |
| Easy | round(previous × 3.5), minimum 4 days |

Intervals are capped at 36,500 days. Timestamps are stored in UTC; a day means 24 hours, including across daylight-saving changes. The UI displays device-local dates and times. The queue includes cards due now or overdue, ordered by recent update. Each attempt has a unique ID, the card is locked during its database transaction, and its version must match. This is a review aid, not a guarantee of memorization.

## Deploy to Vercel

1. Put this folder in a private Git repository and import it in [Vercel](https://vercel.com/new).
2. Keep the detected **Next.js** framework and default build command `npm run build`. Use Node.js 22 or newer.
3. Add both `.env.local` variable names and their values to Vercel's **Environment Variables** for the deployment environments you use. The publishable key is safe in the browser because all data access is protected by RLS. No privileged credentials are used.
4. Deploy. Change Supabase's **Site URL** to your real HTTPS website address. Use the same Supabase project on future deployments to retain all data. Changing environment values requires a new build.
5. Create two real test accounts and verify the checklist in `CHECKLIST.md`, including PDF downloads and email confirmation on the deployed URL.

No storage bucket, AI subscription, or additional backend service is needed. Remote cover images are optional browser images; PDFs deliberately omit covers, so broken images cannot break downloads. The server does not fetch arbitrary article URLs or cover URLs, avoiding a metadata-fetching SSRF surface.

## Architecture and dependencies

- Next.js 16.3.5 App Router, React 19.3, strict TypeScript, Tailwind 4.3.
- Locally owned shadcn-style Button/Dialog components with Radix focus management.
- Supabase SSR cookie authentication; `getUser()` checks on every data/export API; proxy refreshes auth cookies.
- PostgreSQL `records` is a typed aggregate table for books, articles, chapters, vocabulary, cards, and actions. `data.notes` holds structured rich text atomically with its parent record. `parent_id` is the source link; composite foreign keys include the owner ID. Constraint triggers validate the type of each linked parent. `review_events` stores separate immutable attempts. This avoids a proliferation of mostly empty tables while keeping relationships relational and private.
- Row Level Security checks the authenticated owner for every operation. RPCs use **security invoker**, never service-role access. User IDs are derived from `auth.uid()`, not request bodies.
- Zod validates API writes and imports; allowlisted HTML sanitization runs on writes, reads, imports, and PDF rendering. Tiptap supports semantic text, headings, lists, emphasis, links, and quotes.
- React PDF generates selectable text with bundled OFL-licensed Noto Sans regular/bold/italic fonts. PDF-lib stamps page numbers after layout (workaround for a fixed/dynamic footer issue observed with React PDF 4.9). Links and embedded fonts are preserved. The Next.js trace configuration includes all font files in the deployed PDF function.
- Each PDF uses freshly loaded font instances, and rendering is serialized within each server process. This prevents cached glyph character maps from corrupting searchable text across repeated or overlapping exports. Browser tests compare extracted text from all four downloaded export types with saved notes.
- Stable npm release tags were checked and installed; exact resolved versions are kept in `package-lock.json`. `npm ci` reproduces them. A Windows-only Rolldown binding is optional; it does not block Linux/Vercel installs.

Reference documentation checked: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Tiptap Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs), [shadcn Tailwind 4](https://ui.shadcn.com/docs/tailwind-v4), [React PDF fonts](https://react-pdf.org/docs/v4/fonts), [PDF-lib](https://pdf-lib.js.org/docs/api/classes/pdfpage).

## Verification

```sh
npm run typecheck
npm test
npm run test:browser
npm run build
```

On Windows, browser tests use installed Microsoft Edge. On Linux/macOS run `npx playwright install chromium` first. Ports 3001 and 9999 must be available. Tests never require or touch your Supabase account.

The browser harness starts an isolated in-memory PostgreSQL-compatible PGlite instance with the real migration, then exercises the real Next.js server APIs and PDF renderer. Its Supabase HTTP facade simulates authentication for a test user; it is **not a production authentication test**. It lives under `scripts/` and is never imported by the app.

Validated locally:

**Final result: 19 automated tests, the complete browser acceptance journey, strict type checking, and the production build passed. Both light and dark dashboards passed automated WCAG checks.**

- Production compilation and strict TypeScript.
- SQL persistence, stale-write conflicts, ownership isolation with two database roles/user identities, parent-type validation, review idempotency, atomic import rollback, and duplicate-safe round trips.
- French Unicode and accent-insensitive search; safe HTML and URL validation; deterministic UTC scheduling.
- Browser book/chapter creation and reload, chapter edits, failure-and-retry without losing input, vocabulary source navigation, review scheduling after reload, practice outcomes, French article search/filter, PDF download, and backup/import preview.
- Desktop/mobile screenshots, light/dark and English/French controls, keyboard dialog closure, and automated WCAG checks. Automated checks are not a complete assistive-technology audit.
- Long PDF text extraction and rendered page inspection. Export content and omitted reflection sections are checked against the source fixtures.

## Remaining external checks and boundaries

- Supabase and Vercel are configured, the cloud production build succeeded, and the deployed account screen loads. Database isolation was checked on the real Supabase project. Real email delivery, account signup/login, cross-device persistence, and authenticated deployed PDF downloads still need final smoke tests with the owner's account.
- Saves are explicit. There is no automatic merging of concurrent drafts or offline synchronization.
- French navigation, fields, and main workflows are translated. Some infrastructure/setup text and backend error messages remain English.
- Notes support text formatting, not pasted images/tables, embedded media, or mathematical typesetting. Evidence assessments and definitions are user-entered.
- Import limit: 15 MB / 20,000 records / 100,000 review events. Vercel may impose a smaller request-body limit (commonly 4.5 MB); larger backups require a host that accepts them or a future chunked import workflow. PDF selection is capped at 500 records and rendering at the deployment function's time/memory limits; export large books in smaller chapter groups if needed.
- Browser speech requires an installed voice for the correct language. It reports when none is available.

No demo notes, invented book summaries, paid services, chatbots, public sharing, or tracking streaks are included. Decorative book spines on the empty dashboard are explicitly labeled as illustrations.
