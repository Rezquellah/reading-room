import sanitize from "sanitize-html";
export function clean(html: string) {
  return sanitize(html, {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "code",
      "pre",
    ],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitize.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
export function plain(html: string) {
  return sanitize(
    html
      .replace(/<\/(p|h[1-6]|li|blockquote)>/g, "\n")
      .replace(/<br\s*\/?\s*>/g, "\n"),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
