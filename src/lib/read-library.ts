import type { SupabaseClient } from "@supabase/supabase-js";
/** PostgREST caps a response at 1,000 rows. Never silently truncate a library. */
export async function allRows(
  db: SupabaseClient,
  table: "workspaces" | "entries" | "review_logs",
) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}
