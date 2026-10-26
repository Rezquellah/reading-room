import { z } from "zod";
import type { Entry } from "./model";

const short = z.string().trim().min(1).max(500);
const body = z.string().trim().min(1).max(50000);
export const studySchema = z
  .object({
    format: z.literal("reading-room-study-v1"),
    notes: z
      .array(z.object({ title: short, text: body }))
      .max(30)
      .default([]),
    vocabulary: z
      .array(
        z.object({
          word: short,
          definition: body,
          example: z.string().max(5000).default(""),
        }),
      )
      .max(100)
      .default([]),
    cards: z
      .array(z.object({ question: short, answer: body }))
      .max(100)
      .default([]),
  })
  .refine(
    (v) => v.notes.length + v.vocabulary.length + v.cards.length > 0,
    "Include at least one note, word, or recall card.",
  );
export type StudyPack = z.infer<typeof studySchema>;
export function parseStudyPack(raw: string): StudyPack {
  if (raw.length > 500000)
    throw new Error("Choose study material under 500 KB.");
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*\n/i, "")
    .replace(/\n```$/, "");
  try {
    return studySchema.parse(JSON.parse(cleaned));
  } catch {
    throw new Error(
      "This is not a valid Reading Room study pack. Ask ChatGPT for the JSON format in the study prompt, or choose Plain notes.",
    );
  }
}
export function studyPrompt(source: string, language: string, goal: string) {
  return `Help me study ${JSON.stringify(source)} in ${JSON.stringify(language)}. My goal: ${JSON.stringify(goal || "Understand and remember the key ideas")}.
I will upload the ebook or paste the relevant chapter separately. First confirm which chapter and pages you can access. Do not invent missing text or page references.
Teach one section at a time. Explain simply, give an example, then ask one recall question and wait for my answer. Correct misunderstandings before moving on. Distinguish the author's ideas from your own examples. Cite pages or section headings when available.
When I say "Export to Reading Room", return one JSON code block in exactly this format, with no extra keys. All values must be plain text, not HTML. Include only material we actually studied, with source references in note text. Use empty arrays for unused categories:
{"format":"reading-room-study-v1","notes":[{"title":"Section title","text":"Explanation, examples, source references and my reflections"}],"vocabulary":[{"word":"Expression","definition":"Meaning","example":"Example sentence"}],"cards":[{"question":"Recall question","answer":"Concise answer"}]}
Do not include review dates or mastery scores. Reading Room will schedule cards after I review them.`;
}
export async function studyEntries(
  pack: StudyPack,
  source: Pick<Entry, "id" | "workspace_id">,
) {
  const values = [
    ...pack.notes.map((n) => ({
      kind: "note" as const,
      title: n.title,
      data: {
        content: {
          type: "doc",
          content: n.text
            .split(/\n\s*\n/)
            .map((p) => ({
              type: "paragraph",
              content: [{ type: "text", text: p }],
            })),
        },
        plain_text: n.text,
      },
    })),
    ...pack.vocabulary.map((v) => ({
      kind: "vocabulary" as const,
      title: v.word,
      data: { definition: v.definition, example: v.example },
    })),
    ...pack.cards.map((c) => ({
      kind: "card" as const,
      title: c.question,
      data: { answer: c.answer },
    })),
  ];
  return Promise.all(
    values.map(async (value) => {
      // Content-derived IDs make retries and repeat imports safe, without overwriting edits.
      const digest = new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            JSON.stringify(["study-v1", source.workspace_id, source.id, value]),
          ),
        ),
      );
      digest[6] = (digest[6] & 15) | 64;
      digest[8] = (digest[8] & 63) | 128;
      const h = Array.from(digest.slice(0, 16), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
      return {
        ...value,
        id,
        workspace_id: source.workspace_id,
        parent_id: source.id,
        data: { ...value.data, origin: "ChatGPT study import" },
      };
    }),
  );
}
