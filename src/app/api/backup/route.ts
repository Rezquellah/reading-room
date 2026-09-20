import { authorized } from "@/lib/server";
import { backupSchema } from "@/lib/model";
import { clean } from "@/lib/sanitize";
export async function GET() {
  try {
    const { db } = await authorized();
    const { data, error } = await db.rpc("export_backup");
    if (error) throw error;
    return Response.json(data, {
      headers: {
        "Content-Disposition":
          'attachment; filename="reading-room-backup.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Export failed" },
      { status: 400 },
    );
  }
}
export async function POST(req: Request) {
  try {
    const { db } = await authorized();
    const raw = await req.text();
    if (raw.length > 15000000) throw new Error("Backup exceeds 15 MB.");
    const backup = backupSchema.parse(JSON.parse(raw));
    for (const r of backup.records)
      for (const [k, v] of Object.entries(r.data.notes))
        r.data.notes[k as keyof typeof r.data.notes] = clean(v);
    const { data, error } = await db.rpc("import_backup", { backup });
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Import failed." },
      { status: 400 },
    );
  }
}
