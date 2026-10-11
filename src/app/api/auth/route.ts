import { supabase, configured } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
export async function POST(req: Request) {
  if (!configured())
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  const input = z
    .object({
      action: z.enum(["login", "signup", "reset", "update", "logout"]),
      email: z.email().optional(),
      password: z.string().min(8).optional(),
    })
    .refine(
      (v) =>
        v.action === "logout" ||
        (v.action === "update"
          ? Boolean(v.password)
          : v.action === "reset"
            ? Boolean(v.email)
            : Boolean(v.email && v.password)),
    )
    .safeParse(await req.json());
  if (!input.success)
    return NextResponse.json(
      { error: "Use a valid email and a password of at least 8 characters." },
      { status: 400 },
    );
  const db = await supabase();
  const { action, email, password } = input.data;
  const origin = new URL(req.url).origin;
  let result;
  if (action === "logout") result = await db.auth.signOut();
  else if (action === "reset")
    result = await db.auth.resetPasswordForEmail(email!, {
      redirectTo: `${origin}/auth/callback?next=/password`,
    });
  else if (action === "update") result = await db.auth.updateUser({ password });
  else if (action === "signup")
    result = await db.auth.signUp({
      email: email!,
      password: password!,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
  else
    result = await db.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
  return NextResponse.json(
    result.error ? { error: result.error.message } : { ok: true },
    { status: result.error ? 400 : 200 },
  );
}
