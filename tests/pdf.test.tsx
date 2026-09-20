import { it, expect } from "vitest";
import { PDFParse } from "pdf-parse";
import { generatePdf } from "../src/lib/pdf";
import { newRecord, fields } from "../src/lib/model";
import { mkdirSync, writeFileSync } from "node:fs";
it("exports searchable French text, long notes, chapters, articles and vocabulary", async () => {
  const book = {
    ...newRecord("book"),
    title: "Export test — édition française",
  };
  book.data.author = "Test author";
  const chapter = {
    ...newRecord("chapter", book),
    title: "Écouter et réfléchir",
    position: 1,
  };
  chapter.data.notes.quickPaste =
    "<p>Une expérience utile : Noël, cœur, français, « écouter ».</p>" +
    Array.from(
      { length: 75 },
      (_, i) =>
        `<p>Paragraph ${i + 1}. A long saved explanation with enough text to wrap across pages. Les idées deviennent utiles quand on les met en pratique.</p>`,
    ).join("");
  chapter.data.notes.reflections = "<p>PRIVATE REFLECTION</p>";
  const article = { ...newRecord("article"), title: "Article accentué" };
  article.data.notes.mainIdea = "<p>La curiosité mène à la découverte.</p>";
  const word = { ...newRecord("vocabulary"), title: "épanouir" };
  word.data.notes.definition = "<p>Test definition, entered manually.</p>";
  const bytes = await generatePdf(
    [book, chapter, article, word],
    Object.keys(fields).filter((k) => k !== "reflections"),
    "fr",
  );
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  const result = await parser.getText();
  expect(result.text).toContain("Écouter et réfléchir");
  expect(result.text).toContain("Paragraph 75");
  expect(result.text).toContain("Article accentué");
  expect(result.text).toContain("épanouir");
  expect(result.text).not.toContain("PRIVATE REFLECTION");
  expect(result.text).toContain("Reading Room · 2 /");
  expect(result.total).toBeGreaterThan(4);
  await parser.destroy();
  mkdirSync("tmp/pdfs", { recursive: true });
  writeFileSync("tmp/pdfs/export-test.pdf", bytes);
});

it.each(["chapter", "article", "vocabulary"] as const)(
  "exports a standalone %s from its saved content",
  async (kind) => {
    const r = {
      ...newRecord(kind),
      title: `Épreuve ${kind}`,
      language: "fr" as const,
    };
    const key =
      kind === "chapter"
        ? "quickPaste"
        : kind === "article"
          ? "mainIdea"
          : "definition";
    r.data.notes[key] =
      '<p>Une idée à retenir : écouter l’autre.</p><blockquote><p>Attribution manuelle, page 12.</p></blockquote><p><a href="https://example.com/source">Source fournie</a></p>';
    const bytes = await generatePdf([r], Object.keys(fields), "fr");
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    const result = await parser.getText();
    expect(result.text).toContain("écouter l’autre");
    expect(result.text).toContain("page 12");
    expect(result.text).toContain("Reading Room · 1 / 1");
    await parser.destroy();
    writeFileSync(`tmp/pdfs/${kind}-test.pdf`, bytes);
  },
);

it("creates a linked contents page for a multi-chapter book", async () => {
  const book = { ...newRecord("book"), title: "A long study book" };
  const chapters = Array.from({ length: 6 }, (_, i) => {
    const r = {
      ...newRecord("chapter", book),
      position: i + 1,
      title: `Chapter ${i + 1}`,
    };
    r.data.notes.mainIdea = `<p>Saved idea number ${i + 1}.</p>`;
    return r;
  });
  const bytes = await generatePdf([book, ...chapters], ["mainIdea"]);
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  const result = await parser.getText();
  expect(result.text).toContain("Contents");
  expect(result.text).toContain("Saved idea number 6.");
  for (const page of result.pages)
    expect(
      page.text.replace(/Reading Room[^\n]*/g, "").trim().length,
    ).toBeGreaterThan(10);
  await parser.destroy();
  writeFileSync("tmp/pdfs/book-contents-test.pdf", bytes);
});

it("preserves Unicode character maps across concurrent and repeated exports", async () => {
  const contents = [
    "Comprendre avant de répondre.",
    "UPDATED: écoute active et curiosité.",
    "Paying close attention.",
  ];
  const docs = contents.map((text) => {
    const record = { ...newRecord("article"), title: "Repeated export" };
    record.data.notes.mainIdea = `<p>${text}</p>`;
    return record;
  });
  for (let repeat = 0; repeat < 2; repeat++) {
    const buffers = await Promise.all(
      docs.map((r) => generatePdf([r], ["mainIdea"])),
    );
    for (let i = 0; i < buffers.length; i++) {
      const parser = new PDFParse({ data: new Uint8Array(buffers[i]) });
      expect((await parser.getText()).text).toContain(contents[i]);
      await parser.destroy();
    }
  }
});
