import { authorized } from "@/lib/server";
import { recordSchema } from "@/lib/model";
import { clean } from "@/lib/sanitize";
import { NextResponse } from "next/server";
export async function GET() {
  try {
    const { db } = await authorized();
    const records = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db
        .from("records")
        .select("*")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      records.push(
        ...data.map((raw) => {
          const r = recordSchema.parse(raw);
          for (const [k, v] of Object.entries(r.data.notes))
            r.data.notes[k as keyof typeof r.data.notes] = clean(v);
          return r;
        }),
      );
      if (data.length < 1000) break;
    }
    records.sort((a, b) =>
      (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
    );
    return NextResponse.json(records, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unable to load your library.",
      },
      { status: 401 },
    );
  }
}
export async function POST(req: Request) {
  try {
    const { db } = await authorized();
    const body = await req.json();
    const record = recordSchema.parse(body.record);
    for (const [k, v] of Object.entries(record.data.notes))
      record.data.notes[k as keyof typeof record.data.notes] = clean(v);
    const { data, error } = await db.rpc("save_record", {
      item: record,
      expected_version: body.isNew ? 0 : record.version,
    });
    if (error)
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes("conflict") ? 409 : 400 },
      );
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Save failed. Your input is still here.",
      },
      { status: 400 },
    );
  }
}
