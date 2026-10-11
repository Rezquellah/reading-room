import { supabase, configured } from "@/lib/supabase";
import { z } from "zod";
import { recordSchema } from "@/lib/model";
export async function GET() {
  if (!configured()) return new Response(null, { status: 503 });
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const { data, error } = await db.rpc("export_library");
  return error
    ? Response.json({ error: error.message }, { status: 400 })
    : Response.json(data, {
        headers: {
          "Content-Disposition":
            'attachment; filename="reading-room-backup.json"',
          "Cache-Control": "no-store",
        },
      });
}
export async function POST(req: Request) {
  if (!configured()) return new Response(null, { status: 503 });
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  try {
    const raw = await req.text();
    if (raw.length > 3500000) throw new Error("Choose a backup under 3.5 MB.");
    const backup = z
      .object({
        version: z.literal(1),
        workspaces: z
          .array(
            z.object({
              id: z.uuid(),
              name: z.string().min(1).max(100),
              language: z.string().min(2),
              color: z.string(),
              icon: z.string(),
            }),
          )
          .max(1000),
        entries: z
          .array(
            recordSchema.extend({
              id: z.uuid(),
              created_at: z.iso.datetime({ offset: true }).optional(),
            }),
          )
          .max(10000),
        reviews: z
          .array(
            z.object({
              id: z.uuid(),
              card_id: z.uuid(),
              rating: z.number().int().min(1).max(4),
              reviewed_at: z.iso.datetime({ offset: true }),
              next_due: z.iso.datetime({ offset: true }),
              log: z.json(),
            }),
          )
          .default([]),
      })
      .parse(JSON.parse(raw));
    const { data, error } = await db.rpc("import_library", { backup });
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error ? e.message : (e as { message: string }).message,
      },
      { status: 400 },
    );
  }
}

