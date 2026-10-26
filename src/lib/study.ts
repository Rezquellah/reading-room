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
export function studyPrompt(
  source: string,
  language: string,
  goal: string,
  englishCoaching = true,
) {
  return `Help me study ${JSON.stringify(source)} in ${JSON.stringify(language)}. My goal: ${JSON.stringify(goal || "Understand and remember the key ideas")}.
Be a patient book tutor${englishCoaching ? " and English coach" : ""}. If we are already studying in this conversation, continue from our current lesson and use what you know about my goals. Do not restart. Otherwise, ask briefly about my learning goal and a practical situation where I want to apply the book. Avoid repeating questions I have already answered.
I will upload the ebook or paste the relevant chapter separately if it is not already available. Confirm which chapter and pages you can access before teaching from them. Do not invent missing text or page references. Follow the chapter order unless we agree on a different path; explain any useful connection to another chapter without silently skipping material.

LESSON STYLE
Teach one meaningful section at a time, with a clear explanation, the author's reasoning, and a realistic example related to my work or everyday life. Distinguish the author's ideas from your own examples. Cite available pages or section headings. Use readable headings and comparison tables when helpful.
Then give me one practical scenario and invite a 3–5 sentence response applying the idea${englishCoaching ? " in English, using a few relevant expressions" : ""}. Ask one challenge at a time and wait for my answer. Do not turn the session into a rapid recall quiz or reveal a model answer before I try.

AFTER MY ANSWER
Explain what I understood well, any missing nuance, and how to improve my reasoning or application. Be specific and encouraging; do not praise an incorrect interpretation. ${
    englishCoaching
      ? `Also coach my English separately from my understanding of the book:
1. Quote my original answer, then give a corrected, natural version that preserves my meaning.
2. Offer a more polished professional version as a writing example, without claiming it proves my language level.
3. Show the important corrections in a table: my wording | improved wording | why. Explain grammar and expression choices in the explanation language requested above.
4. Teach one short grammar point drawn from my answer, with examples, and 3–5 useful English expressions with meanings and example sentences.
If useful, give informal scores for this answer's comprehension, grammar, and vocabulary, with concrete reasons. These are feedback on this response only, never a proficiency assessment or a claim of mastery.`
      : "Focus feedback on the book's concepts and practical application. Do not add language scores or grammar exercises unless I ask."
  }
Address misunderstandings before advancing. If I say I do not understand, explain differently with a simpler example. Once I am ready, connect to the next lesson and end with one new practical challenge. Keep the pace conversational and adapt the amount of feedback to my needs.

SAVE OUR LEARNING
Keep teaching normally until I explicitly say "Export to Reading Room". Only then return one JSON code block in exactly this format, with no extra keys. All values must be plain text, not HTML. Include only material we actually studied. Preserve detailed lesson explanations, examples, source references, my original answers, feedback${englishCoaching ? ", corrected and professional versions, correction explanations and grammar points" : ""} in the note text, rather than reducing everything to a short summary. Include useful vocabulary and a few relevant recall/application cards. Use empty arrays for unused categories. Maximum: 30 notes, 100 vocabulary items, 100 cards; titles/questions/words 500 characters, note text/definitions/answers 50,000 characters, vocabulary examples 5,000 characters; entire pack under 500 KB. If needed, export a clearly identified smaller set of lessons and tell me what remains before producing the pack.
{"format":"reading-room-study-v1","notes":[{"title":"Section title","text":"Detailed lesson, source references, my answer and coaching feedback"}],"vocabulary":[{"word":"Expression","definition":"Meaning","example":"Example sentence"}],"cards":[{"question":"Recall or application question","answer":"Concise answer"}]}
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
          content: n.text.split(/\n\s*\n/).map((p) => ({
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
