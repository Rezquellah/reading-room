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
