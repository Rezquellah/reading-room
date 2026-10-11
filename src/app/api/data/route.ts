import { NextResponse } from "next/server";
import { supabase, configured } from "@/lib/supabase";
import { recordSchema } from "@/lib/model";
import { z } from "zod";
import { allRows } from "@/lib/read-library";
export async function GET() {
  if (!configured())
    return NextResponse.json(
      { error: "Connect Supabase to save your library." },
      { status: 503 },
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to open your library." },
      { status: 401 },
    );
  try {
    const [w, e, r] = await Promise.all([
      allRows(db, "workspaces"),
      allRows(db, "entries"),
      allRows(db, "review_logs"),
    ]);
    return NextResponse.json({
      workspaces: w,
      entries: e,
      reviews: r,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as { message: string }).message },
      { status: 500 },
    );
  }
}
export async function POST(req: Request) {
  if (!configured())
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Please sign in again." },
      { status: 401 },
    );
  try {
    const body = await req.json();
    if (body.operation === "workspace") {
      const parsed = z
        .object({
          id: z.uuid().optional(),
          name: z.string().trim().min(1).max(100),
          language: z.string().min(2).max(30),
          color: z.string().regex(/^#[0-9a-f]{6}$/i),
          icon: z.string().max(10),
        })
        .parse(body.value);
      const { data, error } = parsed.id
        ? await db
            .from("workspaces")
            .update(parsed)
            .eq("id", parsed.id)
            .select()
            .single()
        : await db
            .from("workspaces")
            .insert({ ...parsed, user_id: user.id })
            .select()
            .single();
      if (error) throw error;
      return NextResponse.json(data);
    }
    if (body.operation === "delete") {
      const id = z.uuid().parse(body.id);
      const { error } = await db.from("entries").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    const value = recordSchema.parse(body.value);
    const { id, updated_at, ...fields } = value;
    let query;
    if (id) {
      if (!updated_at)
        return NextResponse.json(
          { error: "Reload this item before editing." },
          { status: 409 },
        );
      query = db
        .from("entries")
        .update(fields)
        .eq("id", id)
        .eq("updated_at", updated_at)
        .select()
        .maybeSingle();
    } else
      query = db
        .from("entries")
        .insert({ ...fields, user_id: user.id })
        .select()
        .single();
    const { data, error } = await query;
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        {
          error:
            "This item changed on another device. Your draft is preserved; reload to compare.",
        },
        { status: 409 },
      );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : ((error as { message?: string }).message ?? "Unable to save."),
      },
      { status: 400 },
    );
  }
}
