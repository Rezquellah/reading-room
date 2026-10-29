import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { configured, supabase } from "@/lib/supabase";
import { onboardingSchema } from "@/lib/onboarding";

// Called after authentication, including a return from email confirmation.
// A stable user-scoped ID makes retries and simultaneous tabs safe.
export async function POST() {
  if (!configured())
    return NextResponse.json(
      { error: "Accounts are not configured." },
      { status: 503 },
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to finish your welcome setup." },
      { status: 401 },
    );
  const parsed = onboardingSchema.safeParse(
    user.user_metadata?.reading_room_onboarding,
  );
  if (!parsed.success)
    return NextResponse.json({ preferences: null, workspaceId: null });
  const preferences = parsed.data;
  const completed = user.user_metadata?.reading_room_workspace_id;
  if (typeof completed === "string")
    return NextResponse.json({ preferences, workspaceId: completed });
  try {
    const hash = createHash("sha256")
      .update(`reading-room:welcome:v1:${user.id}`)
      .digest("hex");
    const workspaceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const { error } = await db
      .from("workspaces")
      .insert({
        id: workspaceId,
        user_id: user.id,
        name: `${preferences.language} Library`,
        language: preferences.language,
        color: "#355e49",
        icon: "📚",
      });
    if (error && error.code !== "23505") throw error;
    // Confirm ownership through RLS before marking setup complete.
    const verified = await db
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .single();
    if (verified.error || !verified.data)
      throw verified.error ?? new Error("Workspace could not be opened.");
    const saved = await db.auth.updateUser({
      data: { reading_room_workspace_id: workspaceId },
    });
    if (saved.error) throw saved.error;
    return NextResponse.json({ preferences, workspaceId });
  } catch {
    return NextResponse.json(
      {
        error:
          "Your welcome setup couldn’t finish. Your choices are saved; please retry.",
      },
      { status: 500 },
    );
  }
}
