# Reading Room implementation

- [x] Strict Next.js application, responsive workspace and bilingual navigation
- [x] Supabase Auth, private RLS data and ownership-checked source relationships
- [x] Library, chapters, structured notes, quick paste, trash and version-checked saves
- [x] Vocabulary, explicit recall cards, review history and practice actions
- [x] Server PDF export and atomic backup/import with duplicate skipping
- [x] Apply migration to Supabase; verify live RLS, French text, cross-user read/update/export isolation and source ownership in a rolled-back SQL transaction
- [ ] Verify real email signup/login and authenticated cross-device workflows
- [ ] Verify production PDF downloads after Vercel deployment
- [x] 19 automated model, PostgreSQL/RLS and PDF checks
- [x] Repeated/concurrent PDF exports preserve searchable Unicode text; actual browser downloads match saved notes
- [x] Browser acceptance journey using real API routes with local PostgreSQL and simulated Auth
- [x] Browser downloads: book, chapter, French article and selected vocabulary
- [x] Failed-save draft retention, retry, reload persistence, duplicate-safe backup import
- [x] Desktop/mobile inspection and automated WCAG contrast/accessibility checks
- [x] Production build and strict type check

Supabase is configured and the code is in the private GitHub repository. Vercel deployment and real email-account acceptance checks remain. See README for verification boundaries and operating limits.
