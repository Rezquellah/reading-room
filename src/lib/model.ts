import { z } from "zod";
export const kinds = [
  "book",
  "article",
  "chapter",
  "note",
  "vocabulary",
  "quote",
  "card",
  "action",
  "journal",
] as const;
export const recordSchema = z.object({
  id: z.uuid().optional(),
  workspace_id: z.uuid(),
  parent_id: z.uuid().nullable().optional(),
  kind: z.enum(kinds),
  title: z.string().trim().min(1).max(500),
  data: z
    .record(z.string(), z.json())
    .default({})
    .superRefine((data, ctx) => {
      if (JSON.stringify(data).length > 1000000)
        ctx.addIssue({
          code: "custom",
          message: "A note must be smaller than 1 MB.",
        });
      for (const key of [
        "total_pages",
        "current_page",
        "total_chapters",
        "current_chapter",
        "order",
        "reading_time",
        "rating",
      ]) {
        if (
          data[key] !== undefined &&
          data[key] !== "" &&
          (!Number.isFinite(Number(data[key])) ||
            Number(data[key]) < 0 ||
            (key === "rating" && Number(data[key]) > 5))
        )
          ctx.addIssue({
            code: "custom",
            message: `Invalid ${key.replaceAll("_", " ")}`,
          });
      }
      for (const key of ["url", "cover"])
        if (
          typeof data[key] === "string" &&
          data[key] &&
          !/^https?:\/\//i.test(data[key]) &&
          !(key === "cover" && data[key].startsWith("/api/assets?path="))
        )
          ctx.addIssue({
            code: "custom",
            message: "Use an HTTP or HTTPS image or article URL.",
          });
    }),
  updated_at: z.string().optional(),
});
export type Entry = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  kind: (typeof kinds)[number];
  title: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
export type Workspace = {
  id: string;
  name: string;
  language: string;
  color: string;
  icon: string;
};
export function progress(current: number, total: number) {
  if (!Number.isFinite(current) || !Number.isFinite(total)) return 0;
  return total > 0
    ? Math.min(100, Math.max(0, Math.round((current / total) * 100)))
    : 0;
}
export function plainText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const n = value as { text?: string; content?: unknown[] };
  return [n.text ?? "", ...(n.content ?? []).map(plainText)]
    .filter(Boolean)
    .join(" ");
}
export function text(entry: Entry, key: string) {
  return String(entry.data[key] ?? "");
}
