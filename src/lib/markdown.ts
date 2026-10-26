import { Lexer, type MarkedToken, type Token, type Tokens } from "marked";
import type { JSONContent } from "@tiptap/react";

export type MarkdownImage = { reference: string; label: string };
export function cleanMarkdown(raw: string) {
  const value = raw.trim().replace(/^\uFEFF/, "");
  const wrapped = value.match(
    /^(`{3,}|~{3,})(?:markdown|md)\s*\r?\n([\s\S]*)\r?\n\1$/i,
  );
  const text = wrapped ? wrapped[2] : value;
  if (!text.trim())
    throw new Error("Choose a Markdown file or paste your lesson first.");
  if (text.length > 50000)
    throw new Error(
      "Keep each lesson under 50,000 characters. Import longer sessions as separate lessons.",
    );
  return text;
}

// Convert tokens into a fixed set of editor nodes, never imported HTML.
export function markdownDocument(
  raw: string,
  images: Record<string, string> = {},
) {
  const markdown = cleanMarkdown(raw);
  const tokens = Lexer.lex(markdown, { gfm: true });
  const references = new Map<string, MarkdownImage>();
  let count = 0;
  const text = (
    value: string,
    marks: JSONContent["marks"] = [],
  ): JSONContent[] =>
    value
      ? [{ type: "text", text: value, ...(marks.length ? { marks } : {}) }]
      : [];
  function guard(depth: number) {
    if (depth > 40 || ++count > 15000)
      throw new Error(
        "This lesson is too complex. Split it into smaller Markdown files.",
      );
  }
  function inline(
    list: Token[],
    marks: JSONContent["marks"] = [],
    depth = 0,
  ): JSONContent[] {
    return list.flatMap((rawToken): JSONContent[] => {
      guard(depth);
      const t = rawToken as MarkedToken;
      if (t.type === "strong" || t.type === "em" || t.type === "del")
        return inline(
          t.tokens,
          [
            ...marks,
            { type: { strong: "bold", em: "italic", del: "strike" }[t.type] },
          ],
          depth + 1,
        );
      if (t.type === "link") {
        const safe =
          /^(https?:\/\/|mailto:)/i.test(t.href) &&
          !/[\u0000-\u0020]/.test(t.href);
        return inline(
          t.tokens,
          safe
            ? [
                ...marks,
                {
                  type: "link",
                  attrs: {
                    href: t.href,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  },
                },
              ]
            : marks,
          depth + 1,
        );
      }
      if (t.type === "image") {
        references.set(t.href, {
          reference: t.href,
          label: t.text || t.title || "Lesson image",
        });
        const src = Object.hasOwn(images, t.href) ? images[t.href] : undefined;
        // Only authenticated uploads are embedded. Remote and temporary URLs stay placeholders.
        return src?.startsWith("/api/assets?path=")
          ? [{ type: "image", attrs: { src, alt: t.text, title: t.title } }]
          : text(
              `[Image: ${t.text || "Lesson image"} — add picture for ${t.href}]`,
              marks,
            );
      }
      if (t.type === "codespan") return text(t.text, [{ type: "code" }]);
      if (t.type === "br") return [{ type: "hardBreak" }];
      if (t.type === "text" && t.tokens)
        return inline(t.tokens, marks, depth + 1);
      return text("text" in t ? t.text : t.raw, marks);
    });
  }
  function paragraphs(
    nodes: JSONContent[],
    type = "paragraph",
    attrs?: JSONContent["attrs"],
  ) {
    const result: JSONContent[] = [];
    let pending: JSONContent[] = [];
    const flush = () => {
      if (pending.length) {
        result.push({ type, ...(attrs ? { attrs } : {}), content: pending });
        pending = [];
      }
    };
    for (const node of nodes) {
      if (node.type === "image") {
        flush();
        result.push(node);
      } else pending.push(node);
    }
    flush();
    return result.length ? result : [{ type: "paragraph" }];
  }
  function blocks(list: Token[], depth = 0): JSONContent[] {
    return list.flatMap((rawToken): JSONContent[] => {
      guard(depth);
      const t = rawToken as MarkedToken;
      switch (t.type) {
        case "space":
        case "def":
          return [];
        case "heading":
          return paragraphs(inline(t.tokens, [], depth + 1), "heading", {
            level: t.depth,
          });
        case "paragraph":
        case "text":
          return paragraphs(
            t.tokens ? inline(t.tokens, [], depth + 1) : text(t.text),
          );
        case "blockquote":
          return [{ type: "blockquote", content: blocks(t.tokens, depth + 1) }];
        case "hr":
          return [{ type: "horizontalRule" }];
        case "code":
          return [
            {
              type: "codeBlock",
              attrs: { language: t.lang || null },
              content: text(t.text),
            },
          ];
        case "list":
          return [
            {
              type: t.ordered ? "orderedList" : "bulletList",
              ...(t.ordered ? { attrs: { start: t.start || 1 } } : {}),
              content: t.items.map((item) => {
                const content = blocks(item.tokens, depth + 1);
                if (content[0]?.type !== "paragraph")
                  content.unshift({ type: "paragraph" });
                if (item.task)
                  content[0].content = [
                    ...text(item.checked ? "☑ " : "☐ "),
                    ...(content[0].content || []),
                  ];
                return { type: "listItem", content };
              }),
            },
          ];
        case "table": {
          const row = (
            cells: Tokens.TableCell[],
            header: boolean,
          ): JSONContent => ({
            type: "tableRow",
            content: cells.map((cell) => ({
              type: header ? "tableHeader" : "tableCell",
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: paragraphs(
                inline(cell.tokens, [], depth + 1),
                "paragraph",
                { textAlign: cell.align || "left" },
              ),
            })),
          });
          return [
            {
              type: "table",
              content: [
                row(t.header, true),
                ...t.rows.map((cells) => row(cells, false)),
              ],
            },
          ];
        }
        default:
          return paragraphs(text(t.raw));
      }
    });
  }
  const content: JSONContent = { type: "doc", content: blocks(tokens) };
  if (!content.content?.length) content.content = [{ type: "paragraph" }];
  const heading = tokens.find((t) => t.type === "heading") as
    Tokens.Heading | undefined;
  return {
    content,
    images: [...references.values()],
    title: heading?.text.slice(0, 500),
  };
}
