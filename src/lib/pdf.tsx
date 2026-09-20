import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  Font,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "node:path";
import { parseDocument } from "htmlparser2";
import { isTag, isText, type ChildNode } from "domhandler";
import { RecordItem, Field, fields, sections } from "./model";
import { clean, plain } from "./sanitize";
import { fr } from "./i18n";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
function registerFonts() {
  Font.register({
    family: "Helvetica",
    fonts: [
      { src: "Helvetica" },
      { src: "Helvetica-Bold", fontWeight: 700 },
      { src: "Helvetica-Oblique", fontStyle: "italic" },
      { src: "Helvetica-BoldOblique", fontStyle: "italic", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Noto",
    fonts: [
      { src: path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf") },
      {
        src: path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"),
        fontWeight: 700,
      },
      {
        src: path.join(process.cwd(), "public/fonts/NotoSans-Italic.ttf"),
        fontStyle: "italic",
      },
      {
        src: path.join(process.cwd(), "public/fonts/NotoSans-BoldItalic.ttf"),
        fontStyle: "italic",
        fontWeight: 700,
      },
    ],
  });
  Font.registerHyphenationCallback((word) =>
    word.length > 45 ? Array.from(word) : [word],
  );
}
const s = StyleSheet.create({
  page: {
    fontFamily: "Noto",
    fontSize: 10,
    lineHeight: 1.65,
    paddingTop: 55,
    paddingBottom: 62,
    paddingHorizontal: 53,
    color: "#28382e",
  },
  brand: { fontSize: 8, color: "#7b8b72", letterSpacing: 2, marginBottom: 24 },
  title: { fontSize: 26, lineHeight: 1.3, marginBottom: 12, fontWeight: 700 },
  meta: { fontSize: 9, color: "#7c8378", marginBottom: 22 },
  heading: {
    fontSize: 12,
    fontWeight: 700,
    color: "#466047",
    marginTop: 21,
    marginBottom: 10,
  },
  paragraph: { marginBottom: 9 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: "#a6b695",
    paddingLeft: 14,
    marginVertical: 8,
    color: "#53614e",
  },
  footer: {
    position: "absolute",
    top: 802,
    left: 53,
    right: 53,
    height: 20,
    fontSize: 8,
    lineHeight: 1.2,
    color: "#8b9387",
    textAlign: "right",
  },
  link: { color: "#496f52", textDecoration: "underline" },
  toc: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8dc",
  },
  subheading: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 7 },
});
function inline(nodes: ChildNode[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    if (isText(node)) return node.data;
    if (!isTag(node)) return null;
    if (node.name === "br") return "\n";
    if (node.name === "a")
      return (
        <Link key={i} src={node.attribs.href} style={s.link}>
          {inline(node.children)}
        </Link>
      );
    return (
      <Text
        key={i}
        style={
          node.name === "strong"
            ? { fontWeight: 700 }
            : node.name === "em"
              ? { fontStyle: "italic" }
              : node.name === "s"
                ? { textDecoration: "line-through" }
                : {}
        }
      >
        {inline(node.children)}
      </Text>
    );
  });
}
function blocks(nodes: ChildNode[], prefix = ""): React.ReactNode[] {
  return nodes.flatMap((node, i): React.ReactNode[] => {
    const key = `${prefix}${i}`;
    if (isText(node))
      return node.data.trim()
        ? [
            <Text key={key} style={s.paragraph}>
              {node.data}
            </Text>,
          ]
        : [];
    if (!isTag(node)) return [];
    if (node.name === "ul" || node.name === "ol")
      return node.children.filter(isTag).flatMap((li, n) => [
        <View key={`${key}-${n}`} style={{ paddingLeft: 12 }}>
          <Text style={{ fontSize: 9, color: "#788871" }}>
            {node.name === "ol" ? `${n + 1}.` : "•"}
          </Text>
          {blocks(li.children, `${key}-${n}-`)}
        </View>,
      ]);
    if (node.name === "blockquote")
      return [
        <View key={key} style={s.quote}>
          {blocks(node.children, `${key}-`)}
        </View>,
      ];
    if (["p", "h2", "h3", "h4", "pre", "li"].includes(node.name))
      return [
        <Text
          key={key}
          orphans={2}
          widows={2}
          style={node.name.startsWith("h") ? s.subheading : s.paragraph}
        >
          {inline(node.children)}
        </Text>,
      ];
    return [
      <Text key={key} style={s.paragraph}>
        {inline([node])}
      </Text>,
    ];
  });
}
export function StudyDocument({
  records,
  selectedSections,
  locale = "en",
}: {
  records: RecordItem[];
  selectedSections: string[];
  locale?: string;
}) {
  const t = (v: string) => (locale === "fr" ? (fr[v] ?? v) : v);
  const title =
    records[0]?.kind === "vocabulary"
      ? t("Selected vocabulary")
      : (records[0]?.title ?? "Reading Room");
  const bodyRecords = records.filter(
    (r) =>
      !(
        r.kind === "book" &&
        records.length > 1 &&
        !sections[r.kind].some(
          (key) =>
            selectedSections.includes(key) &&
            plain(r.data.notes[key] ?? "").trim(),
        )
      ),
  );
  return (
    <Document
      title={title}
      author="Reading Room"
      language={locale}
      creator="Reading Room"
    >
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>
          READING ROOM / {locale === "fr" ? "NOTES D’ÉTUDE" : "STUDY NOTES"}
        </Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.meta}>
          {records[0]?.kind !== "vocabulary" &&
            [
              records[0]?.data.author,
              records[0]?.data.subtitle,
              records[0]?.data.year,
              records[0]?.language === "fr" ? "Français" : "English",
            ]
              .filter(Boolean)
              .join(" · ")}
          {"\n"}
          {new Date().toLocaleDateString(locale, { dateStyle: "long" })} ·{" "}
          {locale === "fr"
            ? "Export des notes enregistrées"
            : "Exported from saved notes"}
        </Text>
        {records.length > 4 && (
          <View>
            <Text style={s.heading}>
              {locale === "fr" ? "Sommaire" : "Contents"}
            </Text>
            {bodyRecords.map((r) => (
              <Link key={r.id} src={`#${r.id}`} style={[s.link, s.toc]}>
                {r.kind === "chapter" ? `${r.position}. ` : ""}
                {r.title}
              </Link>
            ))}
          </View>
        )}
        {bodyRecords.map((r, index) => (
          <View
            key={r.id}
            break={
              (index > 0 && r.kind !== "vocabulary") ||
              (records.length > 4 && index === 0)
            }
            id={r.id}
          >
            {(r.id !== records[0]?.id ||
              r.kind === "vocabulary" ||
              records.length > 4) && (
              <Text style={s.heading} minPresenceAhead={40}>
                {r.kind === "chapter" ? `${r.position}. ` : ""}
                {r.title}
              </Text>
            )}
            {(r.id !== records[0]?.id || r.kind === "vocabulary") && (
              <Text style={s.meta}>
                {[
                  r.data.author,
                  r.data.subtitle,
                  r.data.year,
                  r.language === "fr" ? "Français" : "English",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
            {r.data.url && (
              <Link style={s.link} src={r.data.url}>
                {r.data.url}
              </Link>
            )}
            {r.kind === "vocabulary" && (
              <Text style={s.meta}>
                {[
                  r.data.partOfSpeech,
                  r.data.gender,
                  r.data.plural,
                  r.data.pronunciation,
                  r.data.synonyms ? `${t("Synonyms")}: ${r.data.synonyms}` : "",
                  r.data.antonyms ? `${t("Antonyms")}: ${r.data.antonyms}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
            {sections[r.kind]
              .filter(
                (key) =>
                  selectedSections.includes(key) &&
                  plain(r.data.notes[key] ?? "").trim(),
              )
              .map((key) => (
                <View key={key}>
                  <Text style={s.heading} minPresenceAhead={35}>
                    {t(fields[key as Field])}
                  </Text>
                  {key === "evidence" && (
                    <Text style={s.meta}>
                      {r.data.evidenceStatus} {r.data.checkedDate} ·
                      User-entered assessment
                    </Text>
                  )}
                  {blocks(
                    parseDocument(clean(r.data.notes[key]!)).children,
                    key,
                  )}
                </View>
              ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
async function renderSavedPdf(
  records: RecordItem[],
  selectedSections: string[],
  locale = "en",
) {
  // Fontkit glyph objects carry mutable Unicode mapping state across renders.
  // Give each document fresh font instances; the queue below prevents overlap.
  Font.clear();
  registerFonts();
  await Promise.all(
    [400, 700].flatMap((fontWeight) =>
      (["normal", "italic"] as const).map((fontStyle) =>
        Font.load({ fontFamily: "Helvetica", fontWeight, fontStyle }),
      ),
    ),
  );
  const bytes = await renderToBuffer(
    <StudyDocument
      records={records}
      selectedSections={selectedSections}
      locale={locale}
    />,
  );
  // Stamp after pagination so arbitrary long notes have reliable page numbers.
  // Workaround for react-pdf 4.9's fixed/dynamic footer rendering regression.
  const document = await PDFDocument.load(bytes);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();
  pages.forEach((page, index) => {
    const text = `Reading Room · ${index + 1} / ${pages.length}`;
    page.drawText(text, {
      font,
      size: 8,
      color: rgb(0.45, 0.5, 0.43),
      x: page.getWidth() - 53 - font.widthOfTextAtSize(text, 8),
      y: 26,
    });
  });
  return Buffer.from(await document.save());
}

let pdfQueue: Promise<void> = Promise.resolve();
export function generatePdf(
  records: RecordItem[],
  selectedSections: string[],
  locale = "en",
) {
  const render = pdfQueue.then(() =>
    renderSavedPdf(records, selectedSections, locale),
  );
  pdfQueue = render.then(
    () => undefined,
    () => undefined,
  );
  return render;
}
