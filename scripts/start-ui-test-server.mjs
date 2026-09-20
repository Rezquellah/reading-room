// Test-only Supabase HTTP facade. Auth is simulated; SQL, RLS, API routes and PDF generation are real.
// This file is never imported by the application and listens only on loopback.
import http from "node:http";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const userId = "11111111-1111-4111-8111-111111111111";
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values ('${userId}');`,
);
await db.exec(readFileSync("supabase/migrations/001_reading_room.sql", "utf8"));
await db.exec(
  `select set_config('request.jwt.claim.sub','${userId}',false); set role authenticated;`,
);
const user = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "reader@example.test",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3001");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
  );
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.end("{}");
    return;
  }
  const url = new URL(req.url, "http://127.0.0.1:9999");
  try {
    if (url.pathname === "/auth/v1/user") {
      res.end(JSON.stringify(user));
      return;
    }
    if (url.pathname === "/auth/v1/logout") {
      res.end("{}");
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const name = url.pathname.split("/").pop();
      const params = {
        save_record: ["item", "expected_version"],
        review_card: ["card", "attempt", "expected_version", "grade"],
        export_backup: [],
        import_backup: ["backup"],
        review_summary: [],
      }[name];
      if (!params) throw new Error("Unsupported test RPC");
      const values = params.map((k) =>
        typeof body[k] === "object" ? JSON.stringify(body[k]) : body[k],
      );
      const result = await db.query(
        `select public.${name}(${params.map((_, i) => "$" + (i + 1)).join(",")}) result`,
        values,
      );
      res.end(JSON.stringify(result.rows[0].result));
      return;
    }
    if (url.pathname === "/rest/v1/records") {
      let rows = (await db.query("select * from records order by id")).rows;
      if (url.searchParams.get("id")?.startsWith("in.")) {
        const ids = url.searchParams.get("id").slice(4, -1).split(",");
        rows = rows.filter((r) => ids.includes(r.id));
      }
      if (url.searchParams.get("deleted_at") === "is.null")
        rows = rows.filter((r) => !r.deleted_at);
      res.end(JSON.stringify(rows));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ message: "Unsupported test endpoint" }));
  } catch (e) {
    res.statusCode = 400;
    res.end(JSON.stringify({ message: e.message, code: "TEST_ERROR" }));
  }
});
await new Promise((resolve) => server.listen(9999, "127.0.0.1", resolve));
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9999",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public-key",
      READING_ROOM_TEST_DIST: ".next-test",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    child.kill();
    server.close();
    void db.close();
    process.exit(0);
  });
child.on("exit", () => {
  server.close();
  void db.close();
  process.exit(0);
});
