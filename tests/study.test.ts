import { describe, expect, it } from "vitest";
import {
  parseStudyPack,
  parseMarkdownStudy,
  studyEntries,
  studyPrompt,
} from "../src/lib/study";
import { markdownDocument } from "../src/lib/markdown";
import { getSchema } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
const source = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
};
describe("study handoff", () => {
  it("populates all four destinations from an older lesson with vocabulary and an unanswered practice scenario", async () => {
    const md =
      "# Negotiation lesson\n\n### 4. English vocabulary for negotiation\n| Expression | Meaning | Example |\n| --- | --- | --- |\n| Agreement | A decision both sides accept | Reach an agreement. |\n| Concession | Giving up part of a request | Make a concession. |\n| Common ground | Shared interests | Find common ground. |\n| Concern | A worry or problem | Address a concern. |\n\n## Negotiation Practice — Challenge 1\n**Status: Awaiting learner response.**\n\nYour manager rejects your proposal.\n\n> We need everyone available.\n\nTry to:\n- Acknowledge their concern.\n- Suggest a way forward.\n\n**Question:** What would you say?\n\nNo model response is included because the exercise has not yet been attempted.\n\n## Visual reference\nA separate image.\n\n## Key takeaway\nConsider both interests.";
    const pack = parseMarkdownStudy(md, "Lesson");
    expect([
      pack.notes.length,
      pack.vocabulary.length,
      pack.cards.length,
      pack.practice.length,
    ]).toEqual([1, 4, 4, 1]);
    expect(pack.vocabularyReview).toBe(true);
    expect(pack.cards[0]).toEqual({
      question: "Agreement",
      answer: "A decision both sides accept",
    });
    expect(pack.practice[0].instructions).toContain(
      "Your manager rejects your proposal.",
    );
    expect(pack.practice[0].instructions).toContain(
      "Acknowledge their concern.",
    );
    expect(pack.practice[0].instructions).not.toContain("A separate image.");
    const entries = await studyEntries(pack, source);
    const practice = entries.find((entry) => entry.kind === "action");
    expect(practice?.data).toMatchObject({ status: "Planned" });
    expect(practice?.data).not.toHaveProperty("reflection");
    for (const entry of entries) {
      expect(entry.workspace_id).toBe(source.workspace_id);
      expect(entry.parent_id).toBe(source.id);
      expect(entry.data).not.toHaveProperty("schedule");
    }
    expect(await studyEntries(pack, source)).toEqual(entries);
  });
  it("splits practice tables into individual exercises and keeps explicit review answers", () => {
    const md =
      "# Lesson\n\n## Vocabulary\n| Word | Definition |\n| --- | --- |\n| Focus | Attention |\n\n## Review cards\n| Question | Answer |\n| --- | --- |\n| What helps? | Practice. |\n\n## Practice\n| Exercise | Instructions |\n| --- | --- |\n| Focus session | Work on one task for ten minutes. |\n| Reflection | Describe what distracted you. |\n| Reflection | Describe what distracted you. |";
    const pack = parseMarkdownStudy(md, "Lesson");
    expect(pack.practice).toHaveLength(2);
    expect(pack.cards).toEqual([
      { question: "What helps?", answer: "Practice." },
    ]);
    expect(pack.vocabularyReview).toBe(false);
    const empty = parseMarkdownStudy(
      "# Note\n\nSome prose without study structures.",
      "Note",
    );
    expect([
      empty.vocabulary.length,
      empty.cards.length,
      empty.practice.length,
    ]).toEqual([0, 0, 0]);
  });
  it("extracts study tables while preserving the full Markdown and deduplicating rows", async () => {
    const md =
      "# Lesson\n\n## Vocabulary\n| Word | Definition | Example |\n| --- | --- | --- |\n| **rappel** | Recall | Le rappel actif. |\n| **rappel** | Recall | Le rappel actif. |\n| incomplete | | |\n\n## Review cards\n| Question | Answer |\n| --- | --- |\n| What helps? | **Practice** and reflection. |\n| Unanswered? | |\n\n## Comparison\n| Original | Improved |\n| --- | --- |\n| I learns | I learn |";
    const pack = parseMarkdownStudy(md, "Fallback");
    expect(pack.notes[0].text).toBe(md);
    expect(pack.vocabulary).toEqual([
      { word: "rappel", definition: "Recall", example: "Le rappel actif." },
    ]);
    expect(pack.cards).toEqual([
      { question: "What helps?", answer: "Practice and reflection." },
    ]);
    const entries = await studyEntries(pack, source);
    expect(entries.map((entry) => entry.kind)).toEqual([
      "note",
      "vocabulary",
      "card",
    ]);
    expect(await studyEntries(pack, source)).toEqual(entries);
  });
  it("recognizes French headers and explicit review Q/A pairs without inventing missing answers", () => {
    const pack = parseMarkdownStudy(
      "# Leçon\n\n| Mot | Définition | Exemple |\n| --- | --- | --- |\n| idée | Une pensée | Une bonne idée. |\n\n## Review\n**Q:** Why?\n\n**A:** Because.\n\nQ: Unanswered?\n\n## Other\nA: Not its answer.\n\n```md\n| Question | Answer |\n| --- | --- |\n| Fake | Fake |\n```",
      "Lesson",
    );
    expect(pack.vocabulary[0].word).toBe("idée");
    expect(pack.cards).toEqual([{ question: "Why?", answer: "Because." }]);
  });
  it("imports Markdown as valid editable rich content with safe image placeholders", async () => {
    const md =
      "# Écouter\n\n## Main idea\n\n**Bold** and *emphasis* with [source](https://example.org).\n\n> Remember this.\n\n3. First\n   - Nested\n4. Second\n\n- [x] Done\n\n| Original | Improved |\n| --- | --- |\n| words | **better** |\n\nBefore ![Diagram](images/diagram.png) after.\n\n```js\nconst x = 1;\n```";
    const pack = parseMarkdownStudy("```markdown\n" + md + "\n```", "Fallback");
    expect(pack.notes[0].title).toBe("Écouter");
    const preview = markdownDocument(md);
    expect(preview.images).toEqual([
      { reference: "images/diagram.png", label: "Diagram" },
    ]);
    expect(JSON.stringify(preview.content)).toContain("add picture");
    const pictures = { "images/diagram.png": "/api/assets?path=owned%2Fimage" };
    const entries = await studyEntries(pack, source, pictures);
    if (!("content" in entries[0].data)) throw new Error("Expected a note");
    const schema = getSchema([StarterKit, Image, TableKit]);
    schema.nodeFromJSON(entries[0].data.content).check();
    const serialized = JSON.stringify(entries[0].data.content);
    for (const type of [
      "heading",
      "bold",
      "italic",
      "blockquote",
      "orderedList",
      "bulletList",
      "table",
      "codeBlock",
      "image",
    ])
      expect(serialized).toContain(`"type":"${type}"`);
    expect(await studyEntries(pack, source, pictures)).toEqual(entries);
  });
  it("never executes Markdown HTML or embeds untrusted image and link URLs", () => {
    const result = markdownDocument(
      "<script>alert(1)</script>\n\n[bad](javascript:alert%281%29) ![remote](https://example.org/tracker.png)",
    );
    const serialized = JSON.stringify(result.content);
    expect(serialized).not.toContain('"type":"image"');
    expect(serialized).not.toContain('"type":"link"');
    expect(serialized).toContain("<script>");
    expect(() => parseMarkdownStudy(" ", "Empty")).toThrow();
    expect(() => parseMarkdownStudy("x".repeat(50001), "Large")).toThrow();
    expect(studyPrompt("Book", "English", "")).toContain("Markdown (.md)");
    expect(studyPrompt("Book", "English", "")).not.toContain(
      "reading-room-study-v1",
    );
  });
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
