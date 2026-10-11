# Reading Room
Next.js App Router, strict TypeScript, Supabase cookie authentication and PostgreSQL RLS. All persistent user content lives in Supabase. Never introduce a localStorage backend or fake review schedules.
Use pnpm. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` and `pnpm test:e2e` before delivery. Live integration tests require a configured Supabase test project.
SQL migrations are additive and versioned in supabase/migrations. Never reset a production database. Scope all content relationships to the authenticated owner and workspace. Secrets belong only in ignored environment files.
Design uses warm paper, forest green, editorial serif headings, accessible controls, and responsive layouts. Keep demo data explicitly labeled and separate from real accounts.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
