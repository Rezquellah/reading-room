import { authorized } from "@/lib/server";
import { generatePdf } from "@/lib/pdf";
import { recordSchema, fields } from "@/lib/model";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const { db } = await authorized();
    const input = z
      .object({
        ids: z.array(z.uuid()).min(1).max(500),
        sections: z.array(z.string()).max(Object.keys(fields).length),
        locale: z.enum(["en", "fr"]).default("en"),
      })
      .parse(await req.json());
    const ids = [...new Set(input.ids)];
    const { data, error } = await db
      .from("records")
      .select("*")
      .in("id", ids)
      .is("deleted_at", null);
    if (error) throw error;
    if (data.length !== ids.length)
      return Response.json(
        {
          error:
            "One or more entries are unavailable. Refresh your library and try again.",
        },
        { status: 404 },
      );
    const records = ids.map((id) =>
      recordSchema.parse(data.find((r) => r.id === id)),
    );
    const pdf = await generatePdf(records, input.sections, input.locale);
    const stem =
      records[0].title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 -]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 70) || "study-notes";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${stem}.pdf"`,
        "x-filename": `${stem}.pdf`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "We could not generate this PDF. Your saved notes are safe.",
      },
      { status: 400 },
    );
  }
}
