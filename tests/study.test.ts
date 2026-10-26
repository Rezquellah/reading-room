import { describe, expect, it } from "vitest";
import { parseStudyPack, studyEntries, studyPrompt } from "../src/lib/study";
const source = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
};
describe("study handoff", () => {
  it("accepts fenced JSON and preserves French text", () => {
    const p = parseStudyPack(
      "```json\n" +
        JSON.stringify({
          format: "reading-room-study-v1",
          notes: [{ title: "Réflexion", text: "Écouter et réfléchir." }],
        }) +
        "\n```",
    );
    expect(p.notes[0].text).toBe("Écouter et réfléchir.");
    expect(p.cards).toEqual([]);
  });
  it("rejects malformed, empty, oversized and incomplete material", () => {
    for (const raw of [
      "hello",
      "{}",
      JSON.stringify({
        format: "reading-room-study-v1",
        cards: [{ question: "Why?" }],
      }),
      "x".repeat(500001),
    ])
      expect(() => parseStudyPack(raw)).toThrow();
  });
  it("uses stable source-scoped IDs and never trusts model-supplied history or ownership", async () => {
    const p = parseStudyPack(
      JSON.stringify({
        format: "reading-room-study-v1",
        cards: [
          {
            question: "Why?",
            answer: "Because.",
            schedule: { due: "2000-01-01" },
            user_id: "other",
          },
        ],
      }),
    );
    const a = await studyEntries(p, source),
      b = await studyEntries(p, source),
      c = await studyEntries(p, {
        ...source,
        id: "33333333-3333-4333-8333-333333333333",
      });
    expect(a).toEqual(b);
    expect(a[0].id).not.toBe(c[0].id);
    expect(a[0].parent_id).toBe(source.id);
    expect(a[0].data).not.toHaveProperty("schedule");
    expect(a[0]).not.toHaveProperty("user_id");
  });
  it("keeps imported markup as plain text", async () => {
    const p = parseStudyPack(
      JSON.stringify({
        format: "reading-room-study-v1",
        notes: [{ title: "A note", text: "<script>alert(1)</script>" }],
      }),
    );
    const entries = await studyEntries(p, source);
    expect(JSON.stringify(entries[0].data)).toContain('"type":"text"');
    expect(studyPrompt("Book", "French", "Learn")).toContain(
      "upload the ebook",
    );
  });
});
