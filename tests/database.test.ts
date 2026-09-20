import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { newRecord, backupSchema } from "../src/lib/model";
const db = new PGlite();
const a = crypto.randomUUID(),
  b = crypto.randomUUID();
const book = { ...newRecord("book"), title: "Test book" };
const chapter = { ...newRecord("chapter", book), title: "First chapter" };
async function asUser(id: string) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
  );
}
async function save(record: unknown, version = 0) {
  return db.query<{ result: Record<string, unknown> }>(
    "select public.save_record($1::jsonb,$2) result",
    [JSON.stringify(record), version],
  );
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values ('${a}'),('${b}');`,
  );
  await db.exec(
    readFileSync("supabase/migrations/001_reading_room.sql", "utf8"),
  );
  await asUser(a);
});
afterAll(async () => await db.close());
it("persists books and chapters, and rejects stale writes", async () => {
  await save(book);
  await save(chapter);
  const updated = { ...chapter, title: "Écouter et réfléchir" };
  await save(updated, 1);
  await expect(save({ ...chapter, title: "Stale" }, 1)).rejects.toThrow(
    /conflict/,
  );
  const result = await db.query<{ title: string }>(
    "select title from records where id=$1",
    [chapter.id],
  );
  expect(result.rows[0].title).toBe(updated.title);
});
it("blocks another account reading, editing, linking, or exporting private records", async () => {
  await asUser(b);
  expect((await db.query("select * from records")).rows).toHaveLength(0);
  await expect(save({ ...book, title: "Stolen" }, 1)).rejects.toThrow();
  await expect(
    save({ ...newRecord("vocabulary", chapter), title: "Wrong owner" }),
  ).rejects.toThrow();
  const backup = await db.query<{ result: { records: unknown[] } }>(
    "select export_backup() result",
  );
  expect(backup.rows[0].result.records).toHaveLength(0);
  await asUser(a);
});
it("validates parent kinds", async () => {
  const wrong = { ...newRecord("chapter", chapter), title: "Invalid nesting" };
  await expect(save(wrong)).rejects.toThrow(/book/);
});
it("records an idempotent review and persists the next due date", async () => {
  const card = { ...newRecord("card", chapter), title: "Recall?" };
  await save(card);
  const attempt = crypto.randomUUID();
  await db.query("select review_card($1,$2,1,$3)", [card.id, attempt, "good"]);
  await db.query("select review_card($1,$2,1,$3)", [card.id, attempt, "good"]);
  expect(
    (await db.query("select * from review_events where card_id=$1", [card.id]))
      .rows,
  ).toHaveLength(1);
  const result = await db.query<{
    data: { interval: number; due: string };
    version: number;
  }>("select data,version from records where id=$1", [card.id]);
  expect(result.rows[0].data.interval).toBe(2);
  expect(result.rows[0].version).toBe(2);
  expect(new Date(result.rows[0].data.due).getTime()).toBeGreaterThan(
    Date.now() + 86400000,
  );
});
it("exports validated backups and reimports without duplication or overwriting", async () => {
  const result = await db.query<{ result: unknown }>(
    "select export_backup() result",
  );
  const backup = backupSchema.parse(result.rows[0].result);
  const before = (await db.query("select * from records")).rows.length;
  await db.query("select import_backup($1)", [JSON.stringify(backup)]);
  expect((await db.query("select * from records")).rows.length).toBe(before);
  expect((await db.query("select * from review_events")).rows).toHaveLength(1);
});
it("rolls back an import when a linked parent is missing", async () => {
  const valid = { ...newRecord("book"), title: "Rollback me" };
  const bad = {
    ...newRecord("chapter"),
    parent_id: crypto.randomUUID(),
    title: "Orphan",
  };
  await expect(
    db.query("select import_backup($1)", [
      JSON.stringify({
        format: "reading-room",
        version: 1,
        records: [valid, bad],
        events: [],
      }),
    ]),
  ).rejects.toThrow();
  expect(
    (await db.query("select * from records where id=$1", [valid.id])).rows,
  ).toHaveLength(0);
});

it("restores complete content and review history into an empty database", async () => {
  const exported = await db.query<{ result: unknown }>(
    "select export_backup() result",
  );
  const backup = backupSchema.parse(exported.rows[0].result);
  await db.exec(
    "reset role; truncate public.records,public.review_events; set role authenticated;",
  );
  await db.query("select import_backup($1)", [JSON.stringify(backup)]);
  const restored = await db.query<{ result: unknown }>(
    "select export_backup() result",
  );
  const parsed = backupSchema.parse(restored.rows[0].result);
  expect(parsed.records.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
    backup.records.sort((a, b) => a.id.localeCompare(b.id)),
  );
  expect(parsed.events).toEqual(backup.events);
});
