import Room from "@/components/room";
import { configured, supabase } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export default async function Page() {
  let email: string | null = null;
  if (configured()) {
    const db = await supabase();
    const { data } = await db.auth.getUser();
    email = data.user?.email ?? null;
  }
  return <Room configured={configured()} email={email} />;
}
