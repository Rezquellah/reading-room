import { describe, expect, it } from "vitest";
import {
  onboardingSchema,
  welcomeStudyPreferences,
} from "../src/lib/onboarding";

describe("welcome choices", () => {
  it("turns learning intentions into usable study defaults", () => {
    const p = onboardingSchema.parse({
      language: " English ",
      goal: "exam",
      minutes: "5",
      interest: "biology finals",
    });
    expect(p.language).toBe("English");
    expect(welcomeStudyPreferences(p)).toMatchObject({
      learningGoal: "exam",
      depth: "Essentials",
      explanationLanguage: "English",
      coachingLanguage: "",
    });
    expect(welcomeStudyPreferences(p).context).toContain("biology finals");
    expect(
      welcomeStudyPreferences({ ...p, goal: "skill", minutes: "30" }),
    ).toMatchObject({ learningGoal: "apply", depth: "In depth" });
    expect(
      welcomeStudyPreferences({
        ...p,
        goal: "language",
        language: "French",
        minutes: "flexible",
      }),
    ).toMatchObject({
      coachingLanguage: "French",
      explanationLanguage: "French",
      depth: "Balanced",
    });
  });
  it("rejects missing choices, unsupported goals, and oversized text", () => {
    const valid = { language: "English", goal: "understand", minutes: "15" };
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
    for (const bad of [
      {},
      { ...valid, language: " " },
      { ...valid, goal: "fake" },
      { ...valid, minutes: "0" },
      { ...valid, interest: "x".repeat(301) },
      { ...valid, language: "x".repeat(31) },
    ])
      expect(onboardingSchema.safeParse(bad).success).toBe(false);
  });
});
