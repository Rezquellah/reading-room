import { z } from "zod";
import { studyPreferencesSchema } from "./study";

export const welcomeGoals = {
  skill: {
    title: "Learn a useful skill",
    detail: "Turn what you read into something you can do.",
    next: "Choose a book or article about the skill you want to build.",
  },
  exam: {
    title: "Prepare for an exam",
    detail: "Understand the material and practise recalling it.",
    next: "Add your textbook or a reading from your syllabus.",
  },
  understand: {
    title: "Understand my reading",
    detail: "Unpack difficult chapters and remember the ideas.",
    next: "Add the book you’re reading. One chapter is a good start.",
  },
  explore: {
    title: "Follow my curiosity",
    detail: "Explore perspectives, questions, and new subjects.",
    next: "Start with a book or article that makes you curious.",
  },
  language: {
    title: "Practise a language",
    detail: "Learn through reading, useful words, and examples.",
    next: "Choose a reading in the language you want to practise.",
  },
} as const;
export const welcomeLanguages = [
  "English",
  "French",
  "Arabic",
  "Spanish",
  "German",
  "Portuguese",
  "Italian",
  "Japanese",
  "Korean",
  "Chinese",
];
export const onboardingSchema = z.object({
  language: z.string().trim().min(2).max(30),
  goal: z.enum(["skill", "exam", "understand", "explore", "language"]),
  minutes: z.enum(["5", "15", "30", "flexible"]),
  interest: z.string().trim().max(300).default(""),
});
export type OnboardingPreferences = z.infer<typeof onboardingSchema>;
export function welcomeStudyPreferences(p: OnboardingPreferences) {
  return studyPreferencesSchema.parse({
    learningGoal:
      p.goal === "skill"
        ? "apply"
        : p.goal === "language"
          ? "understand"
          : p.goal,
    explanationLanguage: p.language,
    coachingLanguage: p.goal === "language" ? p.language : "",
    depth:
      p.minutes === "5"
        ? "Essentials"
        : p.minutes === "30"
          ? "In depth"
          : "Balanced",
    context: [
      p.interest,
      p.minutes === "flexible"
        ? "I prefer a flexible study pace."
        : `I aim for study sessions of about ${p.minutes} minutes.`,
    ]
      .filter(Boolean)
      .join(" "),
  });
}
