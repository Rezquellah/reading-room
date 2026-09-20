import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function serverClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        },
      },
    },
  );
}
export async function authorized() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error(
      "Supabase is not configured. Follow README.md to connect your database.",
    );
  const db = await serverClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new Error("Please sign in to continue.");
  return { db, user };
}
