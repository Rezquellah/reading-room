import { authorized } from "@/lib/server";
import { z } from "zod";
export async function GET() {
  try {
    const { db } = await authorized();
    const { data, error } = await db.rpc("review_summary");
    if (error) throw error;
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error ? e.message : "Unable to load review history.",
      },
      { status: 400 },
    );
  }
}
export async function POST(req: Request) {
  try {
    const { db } = await authorized();
    const input = z
      .object({
        cardId: z.uuid(),
        attemptId: z.uuid(),
        version: z.number().int(),
        rating: z.enum(["again", "hard", "good", "easy"]),
      })
      .parse(await req.json());
    const { data, error } = await db.rpc("review_card", {
      card: input.cardId,
      attempt: input.attemptId,
      expected_version: input.version,
      grade: input.rating,
    });
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Review could not be saved." },
      { status: 400 },
    );
  }
}
