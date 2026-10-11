import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite();
const a = crypto.randomUUID(),
  b = crypto.randomUUID(),
  w = crypto.randomUUID(),
  book = crypto.randomUUID(),
  card = crypto.randomUUID();
async function asUser(id: string) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
  );
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${a}'),('${b}');create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,name text,bucket_id text);create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`,
  );
  for (const file of [
    "202610110001_reading_room.sql",
    "202610110002_integrity_backups.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await asUser(a);
  await db.query("insert into workspaces(id,name) values($1,$2)", [
    w,
    "Bibliothèque française",
  ]);
  await db.query(
    "insert into entries(id,workspace_id,kind,title) values($1,$2,$3,$4)",
    [book, w, "book", "Écouter et réfléchir"],
  );
});
afterAll(() => db.close());
it("persists Unicode and isolates readers", async () => {
  expect(
    (await db.query<{ title: string }>("select title from entries")).rows[0]
      .title,
  ).toBe("Écouter et réfléchir");
  await asUser(b);
  expect((await db.query("select * from entries")).rows).toHaveLength(0);
  expect(
    (
      await db.query("update entries set title=$1 where id=$2 returning *", [
        "stolen",
        book,
      ])
    ).rows,
  ).toHaveLength(0);
  await expect(
    db.query("insert into entries(workspace_id,kind,title) values($1,$2,$3)", [
      w,
      "note",
      "wrong owner",
    ]),
  ).rejects.toThrow();
  await asUser(a);
});
it("rejects invalid parent kinds and cycles", async () => {
  await expect(
    db.query(
      "insert into entries(workspace_id,parent_id,kind,title) values($1,$2,$3,$4)",
      [w, book, "book", "nested book"],
    ),
  ).rejects.toThrow();
  await expect(
    db.query("insert into entries(workspace_id,kind,title) values($1,$2,$3)", [
      w,
      "chapter",
      "orphan chapter",
    ]),
  ).rejects.toThrow();
});
it("writes FSRS state and history atomically and rejects stale attempts", async () => {
  await db.query(
    "insert into entries(id,workspace_id,parent_id,kind,title) values($1,$2,$3,$4,$5)",
    [card, w, book, "card", "What matters?"],
  );
  const { rows } = await db.query<{ updated_at: string }>(
    "select updated_at from entries where id=$1",
    [card],
  );
  const args = [
    card,
    rows[0].updated_at,
    JSON.stringify({ due: "2026-10-12T12:00:00Z", reps: 1 }),
    JSON.stringify({ rating: 3 }),
    3,
    "2026-10-12T12:00:00Z",
  ];
  await db.query("select grade_card($1,$2,$3,$4,$5,$6)", args);
  await expect(
    db.query("select grade_card($1,$2,$3,$4,$5,$6)", args),
  ).rejects.toThrow(/changed/);
  expect((await db.query("select * from review_logs")).rows).toHaveLength(1);
  await asUser(b);
  expect((await db.query("select * from review_logs")).rows).toHaveLength(0);
  await asUser(a);
});
it("backs up complete data and skips duplicates without overwriting", async () => {
  const { rows } = await db.query<{ data: unknown }>(
    "select export_library() data",
  );
  const r = await db.query<{ data: { inserted: number; skipped: number } }>(
    "select import_library($1) data",
    [JSON.stringify(rows[0].data)],
  );
  expect(r.rows[0].data.inserted).toBe(0);
  expect(r.rows[0].data.skipped).toBe(2);
  expect((await db.query("select * from review_logs")).rows).toHaveLength(1);
});
it("rolls back invalid imports instead of partially restoring", async () => {
  const fresh = crypto.randomUUID();
  await expect(
    db.query("select import_library($1)", [
      JSON.stringify({
        version: 1,
        workspaces: [
          {
            id: fresh,
            name: "Rollback",
            language: "fr",
            color: "#355c4a",
            icon: "FR",
          },
        ],
        entries: [
          {
            id: crypto.randomUUID(),
            workspace_id: fresh,
            parent_id: crypto.randomUUID(),
            kind: "note",
            title: "broken",
            data: {},
          },
        ],
        reviews: [],
      }),
    ]),
  ).rejects.toThrow(/missing/);
  expect(
    (await db.query("select * from workspaces where id=$1", [fresh])).rows,
  ).toHaveLength(0);
});
