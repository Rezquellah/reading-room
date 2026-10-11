import { describe, it, expect } from "vitest";
import { progress, plainText, recordSchema } from "../src/lib/model";
import { schedule } from "../src/lib/scheduling";
describe("reading progress", () => {
  it("calculates chapter and page progress and clamps bad ranges", () => {
    expect(progress(7, 20)).toBe(35);
    expect(progress(200, 100)).toBe(100);
    expect(progress(-1, 10)).toBe(0);
    expect(progress(3, 0)).toBe(0);
  });
});
describe("structured notes", () => {
  it("indexes French text inside tables and nested paragraphs", () =>
    expect(
      plainText({
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "paragraph",
                content: [{ text: "Écouter et réfléchir" }],
              },
            ],
          },
        ],
      }),
    ).toBe("Écouter et réfléchir"));
  it("rejects missing ownership and blank titles", () => {
    expect(
      recordSchema.safeParse({
        title: "",
        kind: "book",
        workspace_id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});
describe("FSRS", () => {
  it("schedules every recall grade in the future with persisted state", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    for (const rating of [1, 2, 3, 4]) {
      const r = schedule(undefined, rating, now);
      expect(r.card.due.getTime()).toBeGreaterThan(now.getTime());
      expect(r.card.reps).toBe(1);
      expect(r.log.rating).toBe(rating);
    }
  });
  it("rehydrates dates after a JSON round trip and advances repetitions", () => {
    const first = schedule(undefined, 3, new Date("2026-10-11T12:00:00Z"));
    const saved = JSON.parse(JSON.stringify(first.card));
    const second = schedule(saved, 3, new Date(first.card.due));
    expect(second.card.reps).toBe(2);
    expect(second.card.due.getTime()).toBeGreaterThan(first.card.due.getTime());
  });
  it("rejects invalid grades", () =>
    expect(() => schedule(undefined, 0)).toThrow());
});
