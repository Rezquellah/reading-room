import { supabase, configured } from "@/lib/supabase";
import { redirect } from "next/navigation";
import type { Entry } from "@/lib/model";
import PrintControls from "@/components/print-controls";
import type { ReactNode } from "react";
import { allRows } from "@/lib/read-library";
export const dynamic = "force-dynamic";
type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: Node[];
};
function render(n: Node, i = 0): ReactNode {
  const c = n.content?.map((v, j) => render(v, j));
  if (n.type === "text") {
    let v: ReactNode = n.text;
    for (const m of n.marks ?? []) {
      if (m.type === "bold") v = <strong>{v}</strong>;
      if (m.type === "italic") v = <em>{v}</em>;
      if (m.type === "underline") v = <u>{v}</u>;
      if (m.type === "strike") v = <s>{v}</s>;
      if (m.type === "highlight") v = <mark>{v}</mark>;
      if (m.type === "code") v = <code>{v}</code>;
      if (m.type === "link" && /^https?:\/\//.test(String(m.attrs?.href)))
        v = <a href={String(m.attrs?.href)}>{v}</a>;
    }
    return <span key={i}>{v}</span>;
  }
  switch (n.type) {
    case "heading":
      return n.attrs?.level === 1 ? (
        <h1 key={i}>{c}</h1>
      ) : n.attrs?.level === 3 ? (
        <h3 key={i}>{c}</h3>
      ) : (
        <h2 key={i}>{c}</h2>
      );
    case "paragraph":
      return <p key={i}>{c}</p>;
    case "bulletList":
    case "taskList":
      return <ul key={i}>{c}</ul>;
    case "orderedList":
      return <ol key={i}>{c}</ol>;
    case "listItem":
    case "taskItem":
      return (
        <li key={i}>
          {n.type === "taskItem" ? (n.attrs?.checked ? "☑ " : "☐ ") : ""}
          {c}
        </li>
      );
    case "blockquote":
      return <blockquote key={i}>{c}</blockquote>;
    case "codeBlock":
      return <pre key={i}>{c}</pre>;
    case "horizontalRule":
      return <hr key={i} />;
    case "hardBreak":
      return <br key={i} />;
    case "image":
      return String(n.attrs?.src).startsWith("/api/assets?") ? (
        <img
          key={i}
          src={String(n.attrs?.src)}
          alt={String(n.attrs?.alt ?? "Note image")}
        />
      ) : null;
    case "table":
      return (
        <table key={i}>
          <tbody>{c}</tbody>
        </table>
      );
    case "tableRow":
      return <tr key={i}>{c}</tr>;
    case "tableHeader":
      return <th key={i}>{c}</th>;
    case "tableCell":
      return <td key={i}>{c}</td>;
    default:
      return <div key={i}>{c}</div>;
  }
}
export default async function Print({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  if (!configured()) redirect("/");
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/");
  const params = await searchParams;
  const data = await allRows(db, "entries");
  const entries = data as Entry[];
  const target = entries.find((e) => e.id === params.scope);
  const children = (id: string): Entry[] =>
    entries
      .filter((e) => e.parent_id === id)
      .flatMap((e) => [e, ...children(e.id)]);
  const collection = target
    ? [target, ...children(target.id)]
    : entries.filter(
        (e) =>
          (params.workspace === "all" || e.workspace_id === params.workspace) &&
          (params.scope === "vocabulary"
            ? e.kind === "vocabulary"
            : params.scope === "review"
              ? e.kind === "card"
              : params.scope === "journal"
                ? e.kind === "journal"
                : true),
      );
  return (
    <main className={`print-report ${params.style === "ink" ? "ink" : ""}`}>
      <style>{`@page{size:${params.paper === "Letter" ? "Letter" : "A4"};margin:20mm 18mm}body{background:white!important;color:#263b30!important}.print-report{max-width:800px;margin:30px auto;padding:30px;background:white;color:#263b30}.print-report header{border-bottom:2px solid #355e49;padding-bottom:30px;margin-bottom:35px}.print-report header small{letter-spacing:3px;font-size:10px}.print-report header h1{margin:20px 0 12px;font-size:42px}.print-report section{margin:32px 0}.print-report section>h2{border-bottom:1px solid #dce1d9;padding-bottom:9px;margin-bottom:15px}.print-report p{margin:10px 0;orphans:3;widows:3}.print-report h1,.print-report h2,.print-report h3{break-after:avoid}.print-report table{border-collapse:collapse;width:100%;font-size:12px}.print-report td,.print-report th{border:1px solid #bdc8bb;padding:8px}.print-report tr{break-inside:avoid}.print-report img{max-width:100%;max-height:240mm;object-fit:contain;break-inside:avoid}.print-report blockquote{border-left:3px solid #a8855e;background:#f1f3ec;padding:15px;margin:20px 0}.print-report ul{list-style:disc;padding-left:24px}.print-report ol{list-style:decimal;padding-left:24px}.print-report pre{white-space:pre-wrap;background:#f1f3ec;padding:15px}.print-report dt{font-size:10px;text-transform:uppercase;color:#66715e;margin-top:15px}.print-report dd{margin:5px 0;white-space:pre-wrap}.print-controls{background:#eef1e7;padding:15px;display:flex;gap:20px;align-items:center;font-size:11px;margin-bottom:30px}.print-controls button{border:1px solid #8c9c86;padding:10px}.ink *{background:white!important;color:black!important}.report-toc{border-bottom:1px solid #dce1d9;padding-bottom:20px;margin-bottom:30px}.report-toc a{display:block;font-size:12px;padding:3px 0}@media print{.print-controls{display:none}.print-report{max-width:none;padding:0;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style>
      <PrintControls />
      <header>
        <small>READING ROOM · LEARNING COLLECTION</small>
        <h1>
          {target?.title ??
            `${params.scope === "vocabulary" ? "Vocabulary" : params.scope === "review" ? "Revision" : "Learning"} collection`}
        </h1>
        <p>{String(target?.data.author ?? "Read deeply. Remember longer.")}</p>
        <small>
          {new Intl.DateTimeFormat("en", {
            dateStyle: "long",
            timeZone: "Africa/Casablanca",
          }).format(new Date())}
        </small>
      </header>
      {collection.length > 5 && (
        <nav className="report-toc">
          <h2>In this collection</h2>
          {collection.map((e, i) => (
            <a key={e.id} href={`#entry-${e.id}`}>
              {i + 1}. {e.title}
            </a>
          ))}
        </nav>
      )}
      {collection.map((e) => (
        <section key={e.id} id={`entry-${e.id}`}>
          <small>
            {e.kind.toUpperCase()}
            {e.parent_id
              ? ` · ${entries.find((p) => p.id === e.parent_id)?.title ?? ""}`
              : ""}
          </small>
          <h2>{e.title}</h2>
          {e.data.content ? render(e.data.content as Node) : null}
          <dl>
            {Object.entries(e.data)
              .filter(
                ([k, v]) =>
                  typeof v === "string" &&
                  v &&
                  !["plain_text", "cover", "coverStyle"].includes(k),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replaceAll("_", " ")}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
      <footer>Reading Room · Your personal learning collection</footer>
    </main>
  );
}
