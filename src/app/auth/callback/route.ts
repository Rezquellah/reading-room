import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const db = await supabase();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          url.searchParams.get("next") === "/password" ? "/password" : "/",
          url.origin,
        ),
      );
  }
  return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
}
