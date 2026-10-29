// Loopback-only integration harness. Real PostgreSQL-compatible SQL/RLS; simulated auth.
import http from "node:http";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const id = "11111111-1111-4111-8111-111111111111";
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${id}');create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,name text,bucket_id text);create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`,
);
for (const file of [
  "202610110001_reading_room.sql",
  "202610110002_integrity_backups.sql",
])
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
await db.exec(
  `select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
);
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "reader@example.test",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const assets = new Map();
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url, "http://127.0.0.1:9999");
  try {
    let raw = [];
    for await (const c of req) raw.push(c);
    raw = Buffer.concat(raw);
    if (url.pathname.startsWith("/storage/v1/object/")) {
      const key = url.pathname.replace("/authenticated/", "/");
      if (req.method === "POST") {
        assets.set(key, { data: raw, type: req.headers["content-type"] });
        res.end(JSON.stringify({ Key: key }));
      } else {
        const f = assets.get(key);
        res.setHeader("Content-Type", f?.type ?? "image/png");
        res.end(f?.data);
      }
      return;
    }
    const body = raw.length ? JSON.parse(raw) : {};
    if (url.pathname === "/auth/v1/signup") {
      user.user_metadata = body.data ?? {};
      res.end(JSON.stringify(user));
      return;
    }
    if (url.pathname === "/auth/v1/user") {
      if (req.method === "PUT")
        user.user_metadata = { ...user.user_metadata, ...body.data };
      res.end(JSON.stringify(user));
      return;
    }
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const name = url.pathname.split("/").pop();
      const params = {
        grade_card: [
          "p_id",
          "p_expected",
          "p_state",
          "p_log",
          "p_rating",
          "p_due",
        ],
        export_library: [],
        import_library: ["backup"],
      }[name];
      if (!params) throw new Error("Unsupported RPC");
      const result = await db.query(
        `select public.${name}(${params.map((_, i) => "$" + (i + 1)).join(",")}) result`,
        params.map((k) =>
          typeof body[k] === "object" ? JSON.stringify(body[k]) : body[k],
        ),
      );
      res.end(JSON.stringify(result.rows[0].result));
      return;
    }
    const table = url.pathname.split("/").pop();
    if (
      !["entries", "workspaces", "review_logs", "uploaded_assets"].includes(
        table,
      )
    )
      throw new Error("Unknown table");
    const values = [];
    const conditions = [];
    for (const [k, v] of url.searchParams) {
      if (
        ["id", "kind", "updated_at", "workspace_id"].includes(k) &&
        v.startsWith("eq.")
      ) {
        values.push(v.slice(3));
        conditions.push(`${k}=$${values.length}`);
      }
    }
    const where = conditions.length ? " where " + conditions.join(" and ") : "";
    let result;
    if (req.method === "POST") {
      const cols = Object.keys(body);
      if (cols.some((k) => !/^[a-z_]+$/.test(k)))
        throw new Error("Invalid column");
      result = await db.query(
        `insert into ${table}(${cols.join(",")}) values(${cols.map((_, i) => "$" + (i + 1)).join(",")}) returning *`,
        cols.map((k) =>
          typeof body[k] === "object" && body[k] !== null
            ? JSON.stringify(body[k])
            : body[k],
        ),
      );
    } else if (req.method === "PATCH") {
      const cols = Object.keys(body);
      const offset = values.length;
      result = await db.query(
        `update ${table} set ${cols.map((k, i) => `${k}=$${offset + i + 1}`).join(",")}${where} returning *`,
        [
          ...values,
          ...cols.map((k) =>
            typeof body[k] === "object" && body[k] !== null
              ? JSON.stringify(body[k])
              : body[k],
          ),
        ],
      );
    } else if (req.method === "DELETE") {
      result = await db.query(
        `delete from ${table}${where} returning *`,
        values,
      );
    } else
      result = await db
        .query(`select * from ${table}${where} order by created_at`, values)
        .catch(async (e) => {
          if (table === "review_logs")
            return db.query(`select * from ${table}${where}`, values);
          throw e;
        });
    const single = String(req.headers.accept).includes("vnd.pgrst.object");
    res.end(JSON.stringify(single ? (result.rows[0] ?? null) : result.rows));
  } catch (e) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({ message: e.message, code: e.code ?? "TEST_ERROR" }),
    );
  }
});
await new Promise((r) => server.listen(9999, "127.0.0.1", r));
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
child.on("exit", () => process.exit(0));
