import { supabase, configured } from "@/lib/supabase";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  if (!configured())
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    return NextResponse.json(
      { error: "Choose a JPG, PNG, WebP, or GIF under 5 MB." },
      { status: 400 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid =
    (file.type === "image/png" && bytes[0] === 137 && bytes[1] === 80) ||
    (file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) ||
    (file.type === "image/gif" &&
      String.fromCharCode(...bytes.slice(0, 3)) === "GIF") ||
    (file.type === "image/webp" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
  if (!valid)
    return NextResponse.json(
      { error: "Image contents do not match the file type." },
      { status: 400 },
    );
  const path = `${user.id}/${crypto.randomUUID()}`;
  const { error } = await db.storage
    .from("reading-assets")
    .upload(path, bytes, { contentType: file.type });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  await db
    .from("uploaded_assets")
    .insert({ path, original_name: file.name, user_id: user.id });
  return NextResponse.json({
    url: `/api/assets?path=${encodeURIComponent(path)}`,
  });
}
export async function GET(req: Request) {
  if (!configured()) return new Response(null, { status: 503 });
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const path = new URL(req.url).searchParams.get("path");
  if (!user || !path?.startsWith(`${user.id}/`))
    return new Response(null, { status: 403 });
  const { data, error } = await db.storage
    .from("reading-assets")
    .download(path);
  if (error) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": data.type,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
