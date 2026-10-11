import { supabase, configured } from "@/lib/supabase";
import { schedule } from "@/lib/scheduling";
import { NextResponse } from "next/server";
import { z } from "zod";
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
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const p = z
    .object({
      id: z.uuid(),
      rating: z.number().int().min(1).max(4),
      updated_at: z.string(),
    })
    .safeParse(await req.json());
  if (!p.success)
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  const { data: card, error } = await db
    .from("entries")
    .select("*")
    .eq("id", p.data.id)
    .eq("kind", "card")
    .single();
  if (error)
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  const next = schedule(card.data.schedule, p.data.rating);
  const { error: failure } = await db.rpc("grade_card", {
    p_id: card.id,
    p_expected: p.data.updated_at,
    p_state: next.card,
    p_log: next.log,
    p_rating: p.data.rating,
    p_due: next.card.due.toISOString(),
  });
  return NextResponse.json(
    failure ? { error: failure.message } : { ok: true },
    { status: failure ? 409 : 200 },
  );
}
