# Reading Room implementation

- [x] Strict Next.js application, responsive workspace and bilingual navigation
- [x] Supabase Auth, private RLS data and ownership-checked source relationships
- [x] Library, chapters, structured notes, quick paste, trash and version-checked saves
- [x] Vocabulary, explicit recall cards, review history and practice actions
- [x] Server PDF export and atomic backup/import with duplicate skipping
- [ ] Run migration against configured Supabase and verify multi-account workflows
- [ ] Verify production PDF downloads after Vercel deployment
- [x] 19 automated model, PostgreSQL/RLS and PDF checks
- [x] Repeated/concurrent PDF exports preserve searchable Unicode text; actual browser downloads match saved notes
- [x] Browser acceptance journey using real API routes with local PostgreSQL and simulated Auth
- [x] Browser downloads: book, chapter, French article and selected vocabulary
- [x] Failed-save draft retention, retry, reload persistence, duplicate-safe backup import
- [x] Desktop/mobile inspection and automated WCAG contrast/accessibility checks
- [x] Production build and strict type check

Only the two external infrastructure checks above remain blocked by missing credentials. See README for exact setup steps, verification boundaries and operating limits.
