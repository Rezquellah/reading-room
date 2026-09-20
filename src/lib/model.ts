import { z } from "zod";
export const kinds = [
  "book",
  "article",
  "chapter",
  "vocabulary",
  "card",
  "practice",
] as const;
export type Kind = (typeof kinds)[number];
export const safeUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      (/^https?:\/\//i.test(v) &&
        (() => {
          try {
            const u = new URL(v);
            return !u.username && !u.password;
          } catch {
            return false;
          }
        })()),
    "Use a valid http or https URL.",
  );
export const fields = {
  quickPaste: "Quick paste",
  mainIdea: "Main idea",
  explanation: "Detailed explanation",
  argument: "The author’s claim and reasoning",
  lessons: "Key lessons",
  examples: "Examples",
  evidence: "External evidence and limitations",
  quotations: "Quotations, attribution and page references",
  applications: "Practical applications",
  recallQuestions: "Recall questions",
  recallAnswers: "Recall answers",
  reflections: "My interpretation and unanswered questions",
  revision: "Revision summary",
  sources: "Source references (PDF / printed page)",
  ownWords: "Explain it in my own words",
  summary: "Global summary",
  takeaways: "Overall takeaways",
  supportingPoints: "Supporting points",
  learned: "What I learned",
  personalNotes: "Personal notes",
  definition: "Definition",
  translation: "Translation",
  practiceSentence: "My practice sentence",
  usage: "Usage notes",
  outcome: "Personal experience: what happened",
  changes: "What I would change next time",
  answer: "Reference answer",
} as const;
export type Field = keyof typeof fields;
export const sections: Record<Kind, Field[]> = {
  book: ["summary", "takeaways", "reflections", "sources"],
  article: [
    "mainIdea",
    "supportingPoints",
    "learned",
    "applications",
    "personalNotes",
    "quotations",
    "evidence",
    "sources",
    "ownWords",
  ],
  chapter: [
    "quickPaste",
    "mainIdea",
    "explanation",
    "argument",
    "lessons",
    "examples",
    "evidence",
    "quotations",
    "applications",
    "recallQuestions",
    "recallAnswers",
    "reflections",
    "revision",
    "sources",
    "ownWords",
  ],
  vocabulary: [
    "definition",
    "translation",
    "examples",
    "practiceSentence",
    "usage",
  ],
  card: ["answer"],
  practice: ["outcome", "changes"],
};
export const payloadSchema = z.object({
  author: z.string().max(500).default(""),
  subtitle: z.string().max(500).default(""),
  year: z.string().max(80).default(""),
  category: z.string().max(100).default(""),
  tags: z.string().max(1000).default(""),
  image: safeUrl.default(""),
  url: safeUrl.default(""),
  goal: z.string().max(4000).default(""),
  status: z
    .enum([
      "to-learn",
      "in-progress",
      "completed",
      "planned",
      "tried",
      "reflected",
    ])
    .default("to-learn"),
  notes: z
    .partialRecord(
      z.enum(Object.keys(fields) as [Field, ...Field[]]),
      z.string().max(200000),
    )
    .default({}),
  partOfSpeech: z.string().max(100).default(""),
  gender: z.string().max(100).default(""),
  plural: z.string().max(200).default(""),
  pronunciation: z.string().max(200).default(""),
  synonyms: z.string().max(1000).default(""),
  antonyms: z.string().max(1000).default(""),
  when: z.string().max(2000).default(""),
  targetDate: z.union([z.literal(""), z.iso.date()]).default(""),
  cloze: z.string().max(2000).default(""),
  clozeAnswer: z.string().max(1000).default(""),
  evidenceStatus: z
    .enum([
      "Not checked",
      "Supported",
      "Partly supported",
      "Mixed evidence",
      "Contradicted",
    ])
    .default("Not checked"),
  checkedDate: z.union([z.literal(""), z.iso.date()]).default(""),
  paused: z.boolean().default(false),
  interval: z.number().int().min(0).max(36500).default(0),
  due: z.iso.datetime({ offset: true }).default(() => new Date().toISOString()),
  lastOpened: z.string().default(""),
});
export type Payload = z.infer<typeof payloadSchema>;
export const recordSchema = z.object({
  id: z.uuid(),
  kind: z.enum(kinds),
  title: z.string().trim().min(1, "A title is required.").max(500),
  language: z.enum(["en", "fr"]),
  parent_id: z.uuid().nullable().default(null),
  position: z.number().int().min(0).default(0),
  data: payloadSchema,
  version: z.number().int().positive().default(1),
  deleted_at: z.iso.datetime({ offset: true }).nullable().default(null),
  created_at: z.iso.datetime({ offset: true }).optional(),
  updated_at: z.iso.datetime({ offset: true }).optional(),
});
export type RecordItem = z.infer<typeof recordSchema>;
export function newRecord(kind: Kind, parent?: RecordItem): RecordItem {
  return {
    id: crypto.randomUUID(),
    kind,
    title: "",
    language: parent?.language ?? "en",
    parent_id: parent?.id ?? null,
    position: 0,
    data: payloadSchema.parse({
      status: kind === "practice" ? "planned" : "to-learn",
    }),
    version: 1,
    deleted_at: null,
  };
}
export const backupSchema = z.object({
  format: z.literal("reading-room"),
  version: z.literal(1),
  exportedAt: z.iso.datetime({ offset: true }),
  records: z.array(recordSchema).max(20000),
  events: z
    .array(
      z.object({
        id: z.uuid(),
        card_id: z.uuid(),
        rating: z.enum(["again", "hard", "good", "easy"]),
        reviewed_at: z.iso.datetime({ offset: true }),
        next_due: z.iso.datetime({ offset: true }),
      }),
    )
    .max(100000),
});
export function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}
export function nextReview(
  interval: number,
  rating: "again" | "hard" | "good" | "easy",
  now = new Date(),
) {
  const days =
    rating === "again"
      ? 0
      : rating === "hard"
        ? Math.max(1, Math.round(interval * 1.2))
        : rating === "good"
          ? Math.max(2, Math.round(interval * 2.5))
          : Math.max(4, Math.round(interval * 3.5));
  return {
    interval: Math.min(days, 36500),
    due: new Date(
      now.getTime() + (days ? Math.min(days, 36500) * 86400000 : 600000),
    ).toISOString(),
  };
}
