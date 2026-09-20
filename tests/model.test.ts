import { describe, it, expect } from "vitest";
import {
  recordSchema,
  newRecord,
  nextReview,
  fold,
  backupSchema,
  safeUrl,
} from "../src/lib/model";
import { clean } from "../src/lib/sanitize";
describe("content and review model", () => {
  it("requires just a title and preserves French", () => {
    const record = {
      ...newRecord("chapter"),
      title: "Écouter : l’expérience",
      parent_id: crypto.randomUUID(),
    };
    expect(recordSchema.parse(record).title).toBe(record.title);
    expect(recordSchema.safeParse(newRecord("book")).success).toBe(false);
  });
  it("normalizes search without changing saved content", () =>
    expect(fold("Éléphant, être")).toBe("elephant, etre"));
  it("rejects executable and malformed links", () => {
    expect(safeUrl.safeParse("javascript:alert(1)").success).toBe(false);
    expect(safeUrl.safeParse("https://example.com/image.png").success).toBe(
      true,
    );
    expect(safeUrl.safeParse("https://user:pass@example.com").success).toBe(
      false,
    );
  });
  it("strips active content but preserves meaningful pasted formatting", () => {
    const result = clean(
      '<p onclick="alert(1)">Été <strong>français</strong></p><script>alert(1)</script><a href="javascript:alert(1)">test</a>',
    );
    expect(result).toContain("<strong>français</strong>");
    expect(result).not.toMatch(/onclick|javascript|<script/);
  });
  it("uses deterministic UTC intervals including DST boundaries", () => {
    const date = new Date("2026-03-29T00:30:00.000Z");
    expect(nextReview(0, "again", date).due).toBe("2026-03-29T00:40:00.000Z");
    expect(nextReview(0, "good", date)).toEqual({
      interval: 2,
      due: "2026-03-31T00:30:00.000Z",
    });
    expect(nextReview(10, "hard", date).interval).toBe(12);
    expect(nextReview(10, "easy", date).interval).toBe(35);
  });
  it("rejects unknown backup formats before import", () =>
    expect(backupSchema.safeParse({ records: [] }).success).toBe(false));
});
