"use client";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  Languages,
  RotateCcw,
  Sprout,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Search,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  Feather,
  FileText,
  Download,
  Check,
  Trash2,
  LogOut,
  Menu,
  X,
  Leaf,
  MoreHorizontal,
  Clock,
  Bookmark,
  PanelLeftClose,
  Volume2,
} from "lucide-react";
import {
  RecordItem,
  Kind,
  Field,
  fields,
  sections,
  newRecord,
  fold,
  backupSchema,
} from "@/lib/model";
import { configured, browserClient } from "@/lib/supabase";
import { fr } from "@/lib/i18n";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { RecordForm } from "./record-form";

type Page =
  "Dashboard" | "Library" | "Vocabulary" | "Review" | "Practice" | "Settings";
const nav = [
  { name: "Dashboard" as Page, icon: LayoutDashboard },
  { name: "Library" as Page, icon: Library },
  { name: "Vocabulary" as Page, icon: Languages },
  { name: "Review" as Page, icon: RotateCcw },
  { name: "Practice" as Page, icon: Sprout },
  { name: "Settings" as Page, icon: Settings },
];
const statusLabels: Record<string, string> = {
  "to-learn": "To learn",
  "in-progress": "In progress",
  completed: "Completed",
  planned: "Planned",
  tried: "Tried",
  reflected: "Reflected",
};
async function request(url: string, body?: unknown) {
  const res = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const result = await res.json();
  if (!res.ok)
    throw new Error(result.error ?? "Something went wrong. Please try again.");
  return result;
}
function textOf(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}
function Cover({
  entry,
  small = false,
}: {
  entry: RecordItem;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`cover ${entry.kind} cover-${entry.title.length % 4} ${small ? "small" : ""}`}
    >
      {entry.data.image && !failed ? (
        <img
          src={entry.data.image}
          alt={`Cover: ${entry.title}`}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <>
          <span className="cover-rule" />
          <span className="cover-author">
            {entry.data.author || "READING ROOM"}
          </span>
          <strong>{entry.title}</strong>
          <span className="cover-symbol">
            {entry.kind === "article" ? <FileText /> : <Leaf />}
          </span>
          <span className="cover-foot">
            {entry.language === "fr" ? "NOTES DE LECTURE" : "READING NOTES"}
          </span>
        </>
      )}
    </div>
  );
}
export function Workspace() {
  const [page, setPage] = useState<Page>("Dashboard"),
    [lang, setLang] = useState<"en" | "fr">("en"),
    [dark, setDark] = useState(false),
    [mobile, setMobile] = useState(false),
    [user, setUser] = useState<string | null>(null),
    [loading, setLoading] = useState(configured),
    [records, setRecords] = useState<RecordItem[]>([]),
    [vocabularyReviewed, setVocabularyReviewed] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [form, setForm] = useState<RecordItem | null>(null),
    [dirty, setDirty] = useState(false),
    [auth, setAuth] = useState(false),
    [authMode, setAuthMode] = useState("signin"),
    [authBusy, setAuthBusy] = useState(false),
    [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [language, setLanguage] = useState("all"),
    [status, setStatus] = useState("all"),
    [category, setCategory] = useState("all"),
    [trash, setTrash] = useState(false),
    [vocabSelected, setVocabSelected] = useState<string[]>([]),
    [exportItems, setExportItems] = useState<RecordItem[] | null>(null),
    [exportSections, setExportSections] = useState<string[]>(
      Object.keys(fields),
    ),
    [exportIds, setExportIds] = useState<string[]>([]),
    [exportBusy, setExportBusy] = useState(false),
    [backup, setBackup] = useState<ReturnType<
      typeof backupSchema.parse
    > | null>(null),
    [importBusy, setImportBusy] = useState(false),
    [reveal, setReveal] = useState(false),
    [reviewBusy, setReviewBusy] = useState(false),
    [attempt, setAttempt] = useState(crypto.randomUUID()),
    [ownAnswer, setOwnAnswer] = useState("");
  const reviewLock = useRef(false);
  const sessionGeneration = useRef(0);
  const mutationGeneration = useRef(0);
  const sessionUser = useRef<string | null>(null);
  const t = (s: string) => (lang === "fr" ? (fr[s] ?? s) : s);
  useEffect(() => {
    const l = localStorage.getItem("rr-language") as "en" | "fr";
    if (l === "fr") setLang(l);
    setDark(localStorage.getItem("rr-theme") === "dark");
    const onHash = () => {
      const hash = decodeURIComponent(location.hash.slice(1));
      if (nav.some((n) => n.name === hash)) {
        setPage(hash as Page);
        setSelected(null);
      } else if (hash.startsWith("entry/")) setSelected(hash.slice(6));
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("rr-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("rr-language", lang);
  }, [lang]);
  async function refresh() {
    const sessionAtStart = sessionGeneration.current;
    const mutationAtStart = mutationGeneration.current;
    try {
      const loaded = await request("/api/records");
      if (sessionAtStart !== sessionGeneration.current) return;
      if (mutationAtStart === mutationGeneration.current) setRecords(loaded);
      const summary = await request("/api/review");
      if (sessionAtStart === sessionGeneration.current)
        setVocabularyReviewed(summary.vocabularyReviewed);
    } catch (e) {
      if (sessionAtStart === sessionGeneration.current)
        setError((e as Error).message);
    } finally {
      if (sessionAtStart === sessionGeneration.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!configured) return;
    const db = browserClient();
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      sessionGeneration.current++;
      if (sessionUser.current !== (session?.user.id ?? null)) {
        setRecords([]);
        setVocabularyReviewed(0);
        setForm(null);
        setDirty(false);
        setOwnAnswer("");
        setReveal(false);
      }
      sessionUser.current = session?.user.id ?? null;
      setUser(session?.user.email ?? null);
      if (session) void refresh();
      else {
        setRecords([]);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const byId = new Map(records.map((r) => [r.id, r]));
  const active = records.filter((r) => {
    let node: RecordItem | undefined = r;
    const seen = new Set<string>();
    while (node) {
      if (node.deleted_at || seen.has(node.id)) return false;
      seen.add(node.id);
      node = node.parent_id ? byId.get(node.parent_id) : undefined;
    }
    return true;
  });
  const entries = active.filter(
    (r) => r.kind === "book" || r.kind === "article",
  );
  const vocabulary = active.filter((r) => r.kind === "vocabulary");
  const cards = active.filter((r) => r.kind === "card");
  const due = cards.filter(
    (r) => !r.data.paused && new Date(r.data.due) <= new Date(),
  );
  const actions = active.filter((r) => r.kind === "practice");
  const current = records.find((r) => r.id === selected);
  const card = due[0];
  function go(p: Page) {
    location.hash = p;
    setPage(p);
    setSelected(null);
    setMobile(false);
    setQuery("");
    setTrash(false);
  }
  function open(r: RecordItem) {
    location.hash = `entry/${r.id}`;
    setSelected(r.id);
    setMobile(false);
    if (user) {
      const changed = {
        ...r,
        data: { ...r.data, lastOpened: new Date().toISOString() },
      };
      void persist(changed).catch(() => {});
    }
  }
  function add(kind: Kind, parent?: RecordItem) {
    if (!configured) {
      setNotice(
        "Connect Supabase to save your learning. Open Settings for the setup steps.",
      );
      go("Settings");
      return;
    }
    if (!user) {
      setAuth(true);
      return;
    }
    const r = newRecord(kind, parent);
    if (kind === "chapter")
      r.position =
        records
          .filter((v) => v.parent_id === parent?.id && v.kind === "chapter")
          .reduce((m, v) => Math.max(m, v.position), 0) + 1;
    setDirty(false);
    setForm(r);
  }
  async function persist(r: RecordItem) {
    const sessionAtStart = sessionGeneration.current;
    mutationGeneration.current++;
    const saved = await request("/api/records", {
      record: r,
      isNew: !records.some((v) => v.id === r.id),
    });
    if (sessionAtStart !== sessionGeneration.current)
      throw new Error("Your session changed. Sign in again before saving.");
    setRecords((prev) => [saved, ...prev.filter((v) => v.id !== saved.id)]);
    return saved as RecordItem;
  }
  async function mutate(r: RecordItem) {
    try {
      await persist(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function closeForm(open: boolean) {
    if (
      !open &&
      dirty &&
      !confirm(
        lang === "fr"
          ? "Abandonner les modifications non enregistrées ?"
          : "Discard unsaved changes? Your saved version will remain.",
      )
    )
      return;
    setForm(null);
    setDirty(false);
  }
  function pdf(items: RecordItem[]) {
    setExportItems(items);
    setExportIds(items.map((r) => r.id));
    setExportSections(Object.keys(fields));
  }
  async function downloadPdf() {
    if (!exportItems || exportBusy) return;
    setExportBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: exportIds,
          sections: exportSections,
          locale: lang,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "PDF generation failed.");
      }
      const blob = await res.blob();
      download(blob, res.headers.get("x-filename") ?? "reading-room.pdf");
      setExportItems(null);
      setNotice(lang === "fr" ? "PDF généré." : "PDF generated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExportBusy(false);
    }
  }
  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function backupExport() {
    try {
      const data = await request("/api/backup");
      download(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
        "reading-room-backup.json",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 15000000)
        throw new Error("Maximum backup size is 15 MB.");
      setBackup(backupSchema.parse(JSON.parse(await file.text())));
    } catch {
      setError(
        "This is not a valid Reading Room backup (maximum 15 MB). No data was changed.",
      );
    }
  }
  async function importConfirm() {
    if (!backup || importBusy) return;
    setImportBusy(true);
    try {
      const result = await request("/api/backup", backup);
      setNotice(
        `${result.added} imported · ${result.skipped} existing records skipped`,
      );
      setBackup(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImportBusy(false);
    }
  }
  async function rate(rating: string) {
    if (!card || reviewLock.current) return;
    reviewLock.current = true;
    setReviewBusy(true);
    try {
      const saved = await request("/api/review", {
        cardId: card.id,
        attemptId: attempt,
        version: card.version,
        rating,
      });
      setRecords((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      setReveal(false);
      setOwnAnswer("");
      setAttempt(crypto.randomUUID());
      const summary = await request("/api/review");
      setVocabularyReviewed(summary.vocabularyReviewed);
      setNotice(
        `${t("Saved")} · ${new Date(saved.data.due).toLocaleString(lang)}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReviewBusy(false);
      reviewLock.current = false;
    }
  }
  function makeCard(source: RecordItem, mode = "forward") {
    const r = newRecord("card", source);
    r.title =
      mode === "reverse"
        ? textOf(source.data.notes.definition ?? "")
        : mode === "cloze"
          ? source.data.cloze
          : source.kind === "vocabulary"
            ? source.title
            : "";
    r.data.notes.answer =
      mode === "reverse"
        ? `<p>${source.title}</p>`
        : mode === "cloze"
          ? `<p>${source.data.clozeAnswer}</p>`
          : source.kind === "vocabulary"
            ? `${source.data.notes.definition ?? ""}${source.data.notes.examples ?? ""}`
            : (source.data.notes.mainIdea ?? source.data.notes.revision ?? "");
    setForm(r);
    setDirty(false);
  }
  const filter = (r: RecordItem) => {
    const notes = records
      .filter((c) => c.parent_id === r.id)
      .map((c) => JSON.stringify(c.data.notes))
      .join(" ");
    return (
      (!query ||
        fold(
          `${r.title} ${r.data.author} ${r.data.tags} ${JSON.stringify(r.data.notes)} ${notes}`,
        ).includes(fold(query))) &&
      (type === "all" || r.kind === type) &&
      (language === "all" || r.language === language) &&
      (status === "all" || r.data.status === status) &&
      (category === "all" || r.data.category === category)
    );
  };
  function empty(
    icon: typeof BookOpen,
    title: string,
    body: string,
    action?: React.ReactNode,
  ) {
    const Icon = icon;
    return (
      <div className="empty">
        <span className="empty-icon">
          <Icon size={29} strokeWidth={1.4} />
        </span>
        <h3>{t(title)}</h3>
        <p>{t(body)}</p>
        {action}
      </div>
    );
  }
  function entryGrid(list: RecordItem[]) {
    return (
      <div className="entry-grid">
        {list.map((r) => (
          <button className="entry-card" key={r.id} onClick={() => open(r)}>
            <Cover entry={r} />
            <div className="entry-meta">
              <span className={`type-label ${r.kind}`}>
                {r.kind === "book" ? (
                  <BookOpen size={12} />
                ) : (
                  <FileText size={12} />
                )}{" "}
                {t(r.kind === "book" ? "Books" : "Articles").replace(/s$/, "")}
              </span>
              <span>{r.language.toUpperCase()}</span>
            </div>
            <h3>{r.title}</h3>
            <p>{r.data.author || t("Personal notes")}</p>
            <span className={`status-tag ${r.data.status}`}>
              <i />
              {t(statusLabels[r.data.status])}
            </span>
          </button>
        ))}
      </div>
    );
  }
  function pageHead(
    eyebrow: string,
    title: string,
    subtitle: string,
    buttons?: React.ReactNode,
  ) {
    return (
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t(eyebrow)}</div>
          <h1>{t(title)}</h1>
          <p>{t(subtitle)}</p>
        </div>
        {buttons && <div className="heading-actions">{buttons}</div>}
      </div>
    );
  }
  function renderDetails(r: RecordItem) {
    const children = active
      .filter((c) => c.parent_id === r.id && c.kind === "chapter")
      .sort(
        (a, b) =>
          a.position - b.position || a.created_at!.localeCompare(b.created_at!),
      );
    const source = records.find((v) => v.id === r.parent_id);
    return (
      <>
        <button
          className="text-button back"
          onClick={() =>
            source
              ? open(source)
              : go(
                  r.kind === "vocabulary"
                    ? "Vocabulary"
                    : r.kind === "practice"
                      ? "Practice"
                      : "Library",
                )
          }
        >
          <ChevronLeft size={16} />
          {source?.title || t("Back to library")}
        </button>
        <div className="detail-heading">
          {["book", "article"].includes(r.kind) && <Cover entry={r} small />}
          <div className="detail-title">
            <div className="eyebrow">
              {r.kind} <span> / {r.language.toUpperCase()}</span>
            </div>
            <h1>{r.title}</h1>
            {r.data.subtitle && <p>{r.data.subtitle}</p>}
            <p>
              {r.data.author}
              {r.data.year && ` · ${r.data.year}`}
            </p>
            <span className={`status-tag ${r.data.status}`}>
              {t(statusLabels[r.data.status])}
            </span>
            {r.data.url && (
              <a
                href={r.data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
              >
                {t("Original URL")}
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
          <div className="detail-actions">
            <Button
              variant="outline"
              onClick={() => {
                setForm(r);
                setDirty(false);
              }}
            >
              {t("Edit")}
            </Button>
            <Button variant="outline" onClick={() => pdf([r, ...children])}>
              <Download size={15} />
              {t("Export PDF")}
            </Button>
            <button
              className="icon-button danger"
              title={t("Move to trash")}
              aria-label={t("Move to trash")}
              onClick={() => {
                void mutate({ ...r, deleted_at: new Date().toISOString() });
                go("Library");
              }}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
        {r.data.goal && (
          <div className="goal">
            <Sprout size={20} />
            <div>
              <span>{t("Learning goal")}</span>
              <p>{r.data.goal}</p>
            </div>
          </div>
        )}
        {r.kind === "book" && (
          <section className="panel chapter-list">
            <div className="section-heading">
              <h2>
                {t("Chapters")} <span className="count">{children.length}</span>
              </h2>
              <Button variant="ghost" onClick={() => add("chapter", r)}>
                <Plus size={16} />
                {t("Add chapter")}
              </Button>
            </div>
            {children.length
              ? children.map((c) => (
                  <button
                    key={c.id}
                    className="chapter-row"
                    onClick={() => open(c)}
                  >
                    <span className="chapter-number">
                      {String(c.position).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{c.title}</strong>
                      <small>
                        {textOf(
                          c.data.notes.mainIdea ??
                            c.data.notes.quickPaste ??
                            "",
                        ).slice(0, 100) ||
                          t("Add your first explanation when you’re ready.")}
                      </small>
                    </div>
                    <ChevronRight size={17} />
                  </button>
                ))
              : empty(
                  BookOpen,
                  "No chapters yet",
                  "Add your first explanation when you’re ready.",
                  <Button variant="outline" onClick={() => add("chapter", r)}>
                    <Plus size={15} />
                    {t("Add chapter")}
                  </Button>,
                )}
          </section>
        )}
        <div className="reading-layout">
          <article className="reading-paper">
            {r.kind === "vocabulary" && (
              <dl className="metadata-grid">
                {[
                  ["Part of speech", r.data.partOfSpeech],
                  ["Pronunciation", r.data.pronunciation],
                  ["Gender", r.data.gender],
                  ["Plural form", r.data.plural],
                  ["Synonyms", r.data.synonyms],
                  ["Antonyms", r.data.antonyms],
                ]
                  .filter(([, v]) => v)
                  .map(([label, v]) => (
                    <div key={label}>
                      <dt>{t(label)}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {r.kind === "practice" && (
              <dl className="metadata-grid">
                {r.data.when && (
                  <div>
                    <dt>{t("Where / when")}</dt>
                    <dd>{r.data.when}</dd>
                  </div>
                )}
                {r.data.targetDate && (
                  <div>
                    <dt>{t("Target date")}</dt>
                    <dd>{r.data.targetDate}</dd>
                  </div>
                )}
              </dl>
            )}
            {sections[r.kind].some((k) => textOf(r.data.notes[k] ?? ""))
              ? sections[r.kind]
                  .filter((k) => textOf(r.data.notes[k] ?? ""))
                  .map((k) => (
                    <section
                      key={k}
                      className={`reading-section ${k === "mainIdea" ? "main-idea" : ""}`}
                    >
                      <div className="note-heading">
                        <h2>{t(fields[k])}</h2>
                        {["book", "chapter", "article"].includes(r.kind) && (
                          <button
                            className="text-button"
                            title={t("Create recall card")}
                            aria-label={`${t("Create recall card")}: ${t(fields[k])}`}
                            onClick={() =>
                              makeCard({
                                ...r,
                                data: {
                                  ...r.data,
                                  notes: {
                                    ...r.data.notes,
                                    mainIdea: r.data.notes[k],
                                  },
                                },
                              })
                            }
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                      {k === "evidence" && (
                        <p className="muted">
                          {r.data.evidenceStatus} · {r.data.checkedDate} ·{" "}
                          {t(
                            "These are your assessments, not automatic verification.",
                          )}
                        </p>
                      )}
                      <div
                        className="prose"
                        dangerouslySetInnerHTML={{ __html: r.data.notes[k]! }}
                      />
                    </section>
                  ))
              : empty(
                  Feather,
                  "No notes yet",
                  "Add your first explanation when you’re ready.",
                  <Button variant="outline" onClick={() => setForm(r)}>
                    {t("Edit")}
                  </Button>,
                )}
          </article>
          <aside className="reading-aside">
            <div className="panel">
              <h3>{t("Keep the useful parts.")}</h3>
              {["book", "chapter", "article"].includes(r.kind) && (
                <>
                  <button onClick={() => add("vocabulary", r)}>
                    <Languages size={17} />
                    {t("Add vocabulary")}
                    <Plus size={14} />
                  </button>
                  <button onClick={() => add("practice", r)}>
                    <Sprout size={17} />
                    {t("Add action")}
                    <Plus size={14} />
                  </button>
                </>
              )}
              {["book", "chapter", "article", "vocabulary"].includes(
                r.kind,
              ) && (
                <button onClick={() => makeCard(r)}>
                  <RotateCcw size={17} />
                  {t("Create recall card")}
                  <Plus size={14} />
                </button>
              )}
              {r.kind === "vocabulary" && (
                <>
                  <button onClick={() => makeCard(r, "reverse")}>
                    {t("Definition → word")} <Plus size={14} />
                  </button>
                  {r.data.cloze && r.data.clozeAnswer && (
                    <button onClick={() => makeCard(r, "cloze")}>
                      {t("Sentence completion")} <Plus size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!("speechSynthesis" in window)) {
                        setNotice(
                          "Pronunciation is unavailable in this browser.",
                        );
                        return;
                      }
                      const voices = speechSynthesis.getVoices();
                      const voice = voices.find((v) =>
                        v.lang.startsWith(r.language),
                      );
                      if (!voice) {
                        setNotice(
                          "No pronunciation voice is available for this language on this device.",
                        );
                        return;
                      }
                      const u = new SpeechSynthesisUtterance(r.title);
                      u.lang = r.language === "fr" ? "fr-FR" : "en-GB";
                      u.voice = voice;
                      speechSynthesis.speak(u);
                    }}
                  >
                    <Volume2 size={16} />
                    {t("Pronunciation")}
                  </button>
                </>
              )}
              {source && (
                <button onClick={() => open(source)}>
                  <BookOpen size={16} />
                  {source.title}
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
            {active.filter((v) => v.parent_id === r.id && v.kind !== "chapter")
              .length > 0 && (
              <div className="panel">
                <h3>{t("Source")}</h3>
                {active
                  .filter((v) => v.parent_id === r.id && v.kind !== "chapter")
                  .map((v) => (
                    <button key={v.id} onClick={() => open(v)}>
                      {v.title}
                      <ChevronRight size={14} />
                    </button>
                  ))}
              </div>
            )}
            <div className="record-info">
              {r.data.tags && (
                <p>
                  {r.data.tags.split(",").map((tag) => (
                    <span className="tag" key={tag}>
                      {tag.trim()}
                    </span>
                  ))}
                </p>
              )}
              <p>
                {t("Saved")}{" "}
                {r.updated_at &&
                  new Date(r.updated_at).toLocaleDateString(lang)}
              </p>
            </div>
          </aside>
        </div>
      </>
    );
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          aria-label="Close navigation"
          className="mobile-scrim"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <a href="#Dashboard" className="brand" onClick={() => go("Dashboard")}>
          <span className="brand-icon">
            <BookOpen size={24} strokeWidth={1.6} />
          </span>
          <div>
            Reading Room<small>{t("Your personal learning space")}</small>
          </div>
        </a>
        <div className="sidebar-label">
          {lang === "fr" ? "VOTRE ESPACE" : "YOUR WORKSPACE"}
        </div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <a
              key={n.name}
              aria-label={t(n.name)}
              href={`#${n.name}`}
              className={page === n.name && !selected ? "active" : ""}
              aria-current={page === n.name && !selected ? "page" : undefined}
              onClick={() => go(n.name)}
            >
              <n.icon size={19} strokeWidth={1.7} />
              <span>{t(n.name)}</span>
              {n.name === "Review" && due.length > 0 && (
                <span className="nav-count">{due.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <Sprout size={24} strokeWidth={1.4} />
            <p>{t("A little wiser, every day.")}</p>
            <small>
              {lang === "fr"
                ? "Lisez. Réfléchissez. Grandissez."
                : "Read. Reflect. Grow."}
            </small>
          </div>
          <button
            className="account"
            onClick={() => (user ? go("Settings") : setAuth(true))}
          >
            <span className="avatar">
              {user ? user.slice(0, 1).toUpperCase() : <Feather size={18} />}
            </span>
            <span>
              <strong>{user?.split("@")[0] || t("Your reading room")}</strong>
              <small>{user ? t("Account") : t("Sign in")}</small>
            </span>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>{t("Workspace")}</span>
            <ChevronRight size={13} />
            <strong>{t(selected ? "Library" : page)}</strong>
          </div>
          <div className="topbar-right">
            <span className="today">
              {new Date().toLocaleDateString(lang, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <div className="locale" aria-label="Interface language">
              <button
                className={lang === "en" ? "chosen" : ""}
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
              >
                EN
              </button>
              <span>/</span>
              <button
                className={lang === "fr" ? "chosen" : ""}
                onClick={() => setLang("fr")}
                aria-pressed={lang === "fr"}
              >
                FR
              </button>
            </div>
            <button
              aria-label={t(dark ? "Light" : "Dark")}
              className="icon-button"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main id="main">
          {error && (
            <div className="banner error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="banner" role="status">
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading">{t("Opening your reading room…")}</div>
          ) : current ? (
            renderDetails(current)
          ) : selected ? (
            <>
              {empty(
                BookOpen,
                "Entry unavailable",
                "Sign in to the account that owns this entry.",
              )}
              <Button onClick={() => go("Library")}>
                {t("Back to library")}
              </Button>
            </>
          ) : (
            <>
              {page === "Dashboard" && (
                <>
                  {pageHead(
                    lang === "fr"
                      ? "L’ESPRIT CURIEUX, TOUJOURS"
                      : "STAY CURIOUS",
                    "Make room for what matters.",
                    "A quiet place for your ideas to take root. Pick up where you left off, or discover something new.",
                    <>
                      <Button variant="outline" onClick={() => add("article")}>
                        <Plus size={16} />
                        {t("Add article")}
                      </Button>
                      <Button onClick={() => add("book")}>
                        <Plus size={16} />
                        {t("Add book")}
                      </Button>
                    </>,
                  )}
                  <div className="stats">
                    {[
                      {
                        label: "Books & articles",
                        value: entries.length,
                        icon: BookOpen,
                        color: "sage",
                        detail: `${entries.filter((r) => r.data.status === "completed").length} ${t("Completed").toLowerCase()}`,
                      },
                      {
                        label: "Words collected",
                        value: vocabulary.length,
                        icon: Languages,
                        color: "lilac",
                        detail: `${vocabularyReviewed} ${lang === "fr" ? "mots révisés" : "words reviewed"}`,
                      },
                      {
                        label: "Reviews due",
                        value: due.length,
                        icon: RotateCcw,
                        color: "peach",
                        detail:
                          lang === "fr"
                            ? "À votre rythme"
                            : "A moment to remember",
                      },
                      {
                        label: "Ideas in practice",
                        value: actions.length,
                        icon: Sprout,
                        color: "gold",
                        detail: `${actions.filter((r) => r.data.status === "reflected").length} ${t("Reflected").toLowerCase()}`,
                      },
                    ].map((s) => (
                      <div className="stat" key={s.label}>
                        <div className="stat-top">
                          <span>{t(s.label)}</span>
                          <span className={`stat-icon ${s.color}`}>
                            <s.icon size={17} />
                          </span>
                        </div>
                        <strong>{configured && user ? s.value : "—"}</strong>
                        <small>{s.detail}</small>
                      </div>
                    ))}
                  </div>
                  <div className="dashboard-grid">
                    <div>
                      <section className="study-section">
                        <div className="section-heading">
                          <h2>{t("Continue studying")}</h2>
                          <button
                            className="text-button"
                            onClick={() => go("Library")}
                          >
                            {t("View library")}
                            <ArrowRight size={15} />
                          </button>
                        </div>
                        {entries.length ? (
                          entryGrid(
                            [...entries]
                              .sort((a, b) =>
                                b.data.lastOpened.localeCompare(
                                  a.data.lastOpened,
                                ),
                              )
                              .slice(0, 3),
                          )
                        ) : (
                          <div className="library-empty">
                            <div className="book-art" aria-hidden="true">
                              <div className="art-book a">
                                THE
                                <br />
                                CURIOUS
                                <br />
                                MIND<span>READ • REFLECT</span>
                              </div>
                              <div className="art-book b">
                                <Leaf size={30} />A WORLD
                                <br />
                                OF IDEAS<span>YOUR NEXT CHAPTER</span>
                              </div>
                              <div className="art-book c">
                                les petits
                                <br />
                                <i>pas</i>
                                <span>APPRENDRE CHAQUE JOUR</span>
                              </div>
                            </div>
                            <h3>{t("Your next chapter starts here")}</h3>
                            <p>
                              {t(
                                "Add a book or article to begin building your personal library.",
                              )}
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => add("book")}
                            >
                              <Plus size={15} />
                              {t("Start with a book")}
                            </Button>
                            <small className="illustration-label">
                              {lang === "fr"
                                ? "ILLUSTRATION · AUCUN CONTENU PRÉREMPLI"
                                : "ILLUSTRATION · YOUR LIBRARY STARTS EMPTY"}
                            </small>
                          </div>
                        )}
                      </section>
                      <section className="recent-section">
                        <div className="section-heading">
                          <h2>{t("Recent notes")}</h2>
                          <button
                            className="text-button"
                            onClick={() => go("Library")}
                          >
                            {t("See all")}
                            <ArrowRight size={15} />
                          </button>
                        </div>
                        {active.filter((r) =>
                          Object.values(r.data.notes).some((v) => textOf(v)),
                        ).length ? (
                          active
                            .filter((r) =>
                              Object.values(r.data.notes).some((v) =>
                                textOf(v),
                              ),
                            )
                            .slice(0, 3)
                            .map((r) => (
                              <button
                                className="recent-row"
                                key={r.id}
                                onClick={() => open(r)}
                              >
                                <span className="recent-icon">
                                  <Feather size={19} />
                                </span>
                                <div>
                                  <strong>{r.title}</strong>
                                  <small>
                                    {textOf(
                                      Object.values(r.data.notes)[0] ?? "",
                                    ).slice(0, 100)}
                                  </small>
                                </div>
                                <ArrowUpRight size={17} />
                              </button>
                            ))
                        ) : (
                          <div className="recent-empty">
                            <Feather size={24} strokeWidth={1.4} />
                            <div>
                              <strong>
                                {t("A little reflection goes a long way")}
                              </strong>
                              <p>
                                {t(
                                  "Save an explanation, connect an idea, make it your own.",
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                    <aside className="dashboard-aside">
                      <div className="review-promo">
                        <div className="section-heading">
                          <span className="eyebrow">
                            {lang === "fr"
                              ? "UNE PAUSE POUR SE SOUVENIR"
                              : "A MOMENT TO REMEMBER"}
                          </span>
                          <RotateCcw size={20} />
                        </div>
                        <h2>
                          {lang === "fr"
                            ? "Un peu aujourd’hui.\nBeaucoup demain."
                            : "A little today.\nA lot over time."}
                        </h2>
                        <p>
                          {lang === "fr"
                            ? "Retrouvez vos idées, un mot et une question à la fois."
                            : "Keep your ideas close, one word and one question at a time."}
                        </p>
                        <div className="review-due">
                          <strong>{due.length}</strong>
                          <span>{t("Reviews due").toLowerCase()}</span>
                        </div>
                        <Button onClick={() => go("Review")}>
                          {t("Review today")}
                          <ArrowRight size={16} />
                        </Button>
                      </div>
                      <div className="practice-promo">
                        <span className="practice-leaf">
                          <Sprout size={25} strokeWidth={1.5} />
                        </span>
                        <h3>{t("Put an idea into practice")}</h3>
                        <p>{t("Knowledge grows when you use it.")}</p>
                        {actions
                          .filter((a) => a.data.status === "tried")
                          .slice(0, 2)
                          .map((a) => (
                            <button
                              className="practice-mini"
                              key={a.id}
                              onClick={() => open(a)}
                            >
                              {a.title}
                              <ArrowUpRight size={15} />
                            </button>
                          ))}
                        <button
                          className="text-button"
                          onClick={() => go("Practice")}
                        >
                          {t("Open practice")}
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <div className="language-note">
                        <Languages size={18} />
                        <p>
                          {lang === "fr"
                            ? "Deux langues. Un monde d’idées."
                            : "Two languages. A world of ideas."}
                          <small>English & français</small>
                        </p>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {page === "Library" && (
                <>
                  {pageHead(
                    "YOUR COLLECTION",
                    "Library",
                    "Your books, articles, and the ideas worth returning to.",
                    <>
                      <Button variant="outline" onClick={() => add("article")}>
                        <Plus size={16} />
                        {t("Add article")}
                      </Button>
                      <Button onClick={() => add("book")}>
                        <Plus size={16} />
                        {t("Add book")}
                      </Button>
                    </>,
                  )}
                  <div className="filters">
                    <div className="search">
                      <Search size={17} />
                      <input
                        aria-label={t("Search your library…")}
                        placeholder={t("Search your library…")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="all">{t("All entries")}</option>
                      <option value="book">{t("Books")}</option>
                      <option value="article">{t("Articles")}</option>
                    </select>
                    <select
                      aria-label={t("Language")}
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="all">{t("All languages")}</option>
                      <option value="en">{t("English")}</option>
                      <option value="fr">{t("French")}</option>
                    </select>
                    <select
                      aria-label={t("Status")}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="all">{t("All statuses")}</option>
                      {["to-learn", "in-progress", "completed"].map((s) => (
                        <option value={s} key={s}>
                          {t(statusLabels[s])}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={t("Category")}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="all">{t("All categories")}</option>
                      {[
                        ...new Set(
                          entries.map((r) => r.data.category).filter(Boolean),
                        ),
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      className={`icon-button ${trash ? "selected" : ""}`}
                      aria-label={t("Trash")}
                      title={t("Trash")}
                      onClick={() => setTrash(!trash)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {trash ? (
                    <section className="panel">
                      <h2>{t("Trash")}</h2>
                      {records
                        .filter((r) => r.deleted_at)
                        .map((r) => (
                          <div className="list-row" key={r.id}>
                            <span>{r.title}</span>
                            <Button
                              variant="outline"
                              onClick={() => mutate({ ...r, deleted_at: null })}
                            >
                              {t("Restore")}
                            </Button>
                          </div>
                        ))}
                      {!records.some((r) => r.deleted_at) && (
                        <p className="muted">Your trash is empty.</p>
                      )}
                    </section>
                  ) : entries.filter(filter).length ? (
                    entryGrid(entries.filter(filter))
                  ) : (
                    empty(
                      BookOpen,
                      entries.length
                        ? "No matching entries"
                        : "Your next chapter starts here",
                      entries.length
                        ? "Try a different search or filter."
                        : "Add a book or article to begin building your personal library.",
                      <Button onClick={() => add("book")}>
                        <Plus size={16} />
                        {t("Add book")}
                      </Button>,
                    )
                  )}
                </>
              )}
              {page === "Vocabulary" && (
                <>
                  {pageHead(
                    "THE WORD NOTEBOOK",
                    "Your words, remembered",
                    "Collect useful words and expressions in English and French.",
                    <>
                      <Button
                        variant="outline"
                        disabled={!vocabSelected.length}
                        onClick={() =>
                          pdf(
                            vocabulary.filter((r) =>
                              vocabSelected.includes(r.id),
                            ),
                          )
                        }
                      >
                        <Download size={16} />
                        {t("Export PDF")}
                      </Button>
                      <Button onClick={() => add("vocabulary")}>
                        <Plus size={16} />
                        {t("Add vocabulary")}
                      </Button>
                    </>,
                  )}
                  <div className="filters">
                    <div className="search">
                      <Search size={17} />
                      <input
                        placeholder={t("Search words…")}
                        aria-label={t("Search words…")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label={t("Language")}
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="all">{t("All languages")}</option>
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setVocabSelected(vocabulary.map((r) => r.id))
                      }
                    >
                      {t("Select all")}
                    </Button>
                  </div>
                  <div className="vocabulary-grid">
                    {vocabulary
                      .filter(
                        (r) =>
                          (!query ||
                            fold(
                              r.title + JSON.stringify(r.data.notes),
                            ).includes(fold(query))) &&
                          (language === "all" || r.language === language),
                      )
                      .map((r) => (
                        <div className="vocab-card" key={r.id}>
                          <div className="vocab-top">
                            <span className="language-badge">
                              {r.language === "fr" ? "FRANÇAIS" : "ENGLISH"}
                            </span>
                            <input
                              type="checkbox"
                              aria-label={`Select ${r.title}`}
                              checked={vocabSelected.includes(r.id)}
                              onChange={(e) =>
                                setVocabSelected(
                                  e.target.checked
                                    ? [...vocabSelected, r.id]
                                    : vocabSelected.filter((id) => id !== r.id),
                                )
                              }
                            />
                          </div>
                          <button
                            className="vocab-word"
                            onClick={() => open(r)}
                          >
                            {r.title}
                            <ArrowUpRight size={17} />
                          </button>
                          <small>
                            {r.data.partOfSpeech}{" "}
                            {r.data.gender && ` · ${r.data.gender}`}
                          </small>
                          <p>
                            {textOf(r.data.notes.definition ?? "").slice(
                              0,
                              200,
                            ) || "Add a definition in your own words."}
                          </p>
                          {r.parent_id && (
                            <button
                              className="source-chip"
                              onClick={() => {
                                const source = records.find(
                                  (v) => v.id === r.parent_id,
                                );
                                if (source) open(source);
                              }}
                            >
                              <BookOpen size={13} />
                              {records.find((v) => v.id === r.parent_id)?.title}
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                  {!vocabulary.length &&
                    empty(
                      Languages,
                      "One word at a time",
                      "Collect useful words and expressions in English and French.",
                      <Button onClick={() => add("vocabulary")}>
                        {t("Add vocabulary")}
                      </Button>,
                    )}
                </>
              )}
              {page === "Review" && (
                <>
                  {pageHead(
                    "RECALL & REFLECT",
                    "Ready when you are",
                    "Make a little space to remember.",
                    <Button variant="outline" onClick={() => add("card")}>
                      <Plus size={16} />
                      {t("Create recall card")}
                    </Button>,
                  )}
                  {card ? (
                    <div className="review-workspace">
                      <div className="review-progress">
                        <span>
                          {due.length} {t("Reviews due").toLowerCase()}
                        </span>
                        <span>{card.language.toUpperCase()}</span>
                      </div>
                      <div className="flashcard">
                        <RotateCcw size={25} />
                        <h2>{card.title}</h2>
                        <textarea
                          aria-label="Your answer"
                          placeholder={
                            lang === "fr"
                              ? "Votre réponse (facultatif)…"
                              : "Think it through, or type your answer…"
                          }
                          value={ownAnswer}
                          onChange={(e) => setOwnAnswer(e.target.value)}
                        />
                        {reveal ? (
                          <>
                            <div
                              className="reference-answer prose"
                              dangerouslySetInnerHTML={{
                                __html: card.data.notes.answer ?? "",
                              }}
                            />
                            <p className="muted">
                              {lang === "fr"
                                ? "Comment vous en êtes-vous souvenu ?"
                                : "How well did you remember?"}
                            </p>
                            <div className="ratings">
                              {["again", "hard", "good", "easy"].map((r) => (
                                <Button
                                  key={r}
                                  disabled={reviewBusy}
                                  variant="outline"
                                  onClick={() => rate(r)}
                                >
                                  {t(r[0].toUpperCase() + r.slice(1))}
                                </Button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <Button onClick={() => setReveal(true)}>
                            {t("Reveal answer")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    empty(
                      RotateCcw,
                      "No reviews due right now",
                      "Create a card from a chapter, article, or vocabulary entry. Your scheduled cards will appear here.",
                    )
                  )}
                  <section className="panel">
                    <h2>
                      {t("All cards")}{" "}
                      <span className="count">{cards.length}</span>
                    </h2>
                    {cards.map((c) => (
                      <div className="list-row" key={c.id}>
                        <button className="text-button" onClick={() => open(c)}>
                          {c.title}
                        </button>
                        <small>
                          {new Date(c.data.due).toLocaleString(lang)}
                        </small>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            mutate({
                              ...c,
                              data: { ...c.data, paused: !c.data.paused },
                            })
                          }
                        >
                          {t(c.data.paused ? "Resume" : "Pause")}
                        </Button>
                      </div>
                    ))}
                  </section>
                  <p className="footnote">
                    {lang === "fr"
                      ? "Calendrier simple : encore = 10 minutes ; difficile = ×1,2 (minimum 1 jour) ; bien = ×2,5 (minimum 2 jours) ; facile = ×3,5 (minimum 4 jours)."
                      : "Simple schedule: Again = 10 minutes; Hard = ×1.2 (minimum 1 day); Good = ×2.5 (minimum 2 days); Easy = ×3.5 (minimum 4 days)."}{" "}
                    UTC ·{" "}
                    {lang === "fr"
                      ? "Les dates sont affichées dans votre fuseau horaire."
                      : "Dates are shown in your local time zone."}
                  </p>
                </>
              )}
              {page === "Practice" && (
                <>
                  {pageHead(
                    "BEYOND THE PAGE",
                    "Turn understanding into action",
                    "Small steps. Real-world learning.",
                    <Button onClick={() => add("practice")}>
                      <Plus size={16} />
                      {t("Add action")}
                    </Button>,
                  )}
                  <div className="practice-board">
                    {["planned", "tried", "reflected"].map((s) => (
                      <section key={s}>
                        <h2>
                          <i className={s} />
                          {t(statusLabels[s])}
                          <span className="count">
                            {actions.filter((a) => a.data.status === s).length}
                          </span>
                        </h2>
                        {actions
                          .filter((a) => a.data.status === s)
                          .map((a) => (
                            <button
                              className="action-card"
                              key={a.id}
                              onClick={() => open(a)}
                            >
                              <Sprout size={19} />
                              <h3>{a.title}</h3>
                              <p>{a.data.when}</p>
                              {a.data.targetDate && (
                                <small>
                                  <Clock size={13} />
                                  {a.data.targetDate}
                                </small>
                              )}
                              {a.data.notes.outcome && (
                                <p>
                                  {textOf(a.data.notes.outcome).slice(0, 100)}
                                </p>
                              )}
                            </button>
                          ))}
                        {!actions.some((a) => a.data.status === s) && (
                          <div className="column-empty">
                            {lang === "fr"
                              ? "Place à votre prochaine idée."
                              : "Room for your next idea."}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                </>
              )}
              {page === "Settings" && (
                <>
                  {pageHead(
                    "MAKE YOURSELF AT HOME",
                    "Settings",
                    "Your personal learning space",
                  )}
                  <div className="settings-grid">
                    <section className="panel">
                      <h2>{t("Appearance")}</h2>
                      <div className="segmented">
                        <button
                          onClick={() => setDark(false)}
                          className={!dark ? "chosen" : ""}
                        >
                          <Sun size={18} />
                          {t("Light")}
                        </button>
                        <button
                          onClick={() => setDark(true)}
                          className={dark ? "chosen" : ""}
                        >
                          <Moon size={18} />
                          {t("Dark")}
                        </button>
                      </div>
                      <h2>{t("Interface language")}</h2>
                      <div className="segmented">
                        <button
                          className={lang === "en" ? "chosen" : ""}
                          onClick={() => setLang("en")}
                        >
                          English
                        </button>
                        <button
                          className={lang === "fr" ? "chosen" : ""}
                          onClick={() => setLang("fr")}
                        >
                          Français
                        </button>
                      </div>
                      <p className="muted">
                        {lang === "fr"
                          ? "La langue des notes reste indépendante de celle de l’interface."
                          : "Your notes keep their own language, independently of the interface."}
                      </p>
                    </section>
                    <section className="panel">
                      <h2>{t("Account")}</h2>
                      {user ? (
                        <>
                          <p>{user}</p>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              await browserClient().auth.signOut();
                              setSelected(null);
                              setRecords([]);
                              setUser(null);
                            }}
                          >
                            <LogOut size={15} />
                            {t("Sign out")}
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setAuth(true)}>
                          {t("Sign in")}
                        </Button>
                      )}
                      {!configured && (
                        <div className="setup-notice">
                          <h3>{t("Database setup needed")}</h3>
                          <ol>
                            <li>Create a free Supabase project.</li>
                            <li>
                              Run{" "}
                              <code>
                                supabase/migrations/001_reading_room.sql
                              </code>{" "}
                              in its SQL Editor.
                            </li>
                            <li>
                              Copy <code>.env.example</code> to{" "}
                              <code>.env.local</code> and fill in your project
                              URL and publishable key.
                            </li>
                            <li>
                              Restart the app. Full instructions are in{" "}
                              <code>README.md</code>.
                            </li>
                          </ol>
                          <p>
                            Nothing is saved until your database is connected.
                          </p>
                        </div>
                      )}
                    </section>
                    <section className="panel backup-panel">
                      <h2>{t("Your data belongs to you")}</h2>
                      <p className="muted">
                        {lang === "fr"
                          ? "Sauvegardez vos notes, vos cartes, vos actions et votre historique. L’import ignore les identifiants existants sans écraser vos données."
                          : "Back up your notes, cards, actions, and review history. Import skips existing IDs without overwriting your data."}
                      </p>
                      <div className="button-row">
                        <Button
                          variant="outline"
                          disabled={!user}
                          onClick={backupExport}
                        >
                          <Download size={16} />
                          {t("Download backup")}
                        </Button>
                        <label
                          className={`button button-outline ${!user ? "disabled" : ""}`}
                        >
                          {t("Import backup")}
                          <input
                            className="sr-only"
                            type="file"
                            accept="application/json,.json"
                            disabled={!user}
                            onChange={(e) => {
                              void importFile(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <BookOpen size={14} />
            <span>Reading Room</span>
            <span className="footer-dot">·</span>
            {t("A little wiser, every day.")}
            <span className="footer-private">
              {user
                ? "Private workspace"
                : configured
                  ? "Sign in to save your learning"
                  : "Awaiting database connection"}
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={Boolean(form)}
        onOpenChange={closeForm}
        title={
          form
            ? t(
                records.some((r) => r.id === form.id)
                  ? "Edit"
                  : form.kind === "book"
                    ? "Add book"
                    : form.kind === "article"
                      ? "Add article"
                      : form.kind === "vocabulary"
                        ? "Add vocabulary"
                        : form.kind === "chapter"
                          ? "Add chapter"
                          : form.kind === "practice"
                            ? "Add action"
                            : "Create recall card",
              )
            : ""
        }
      >
        {form && (
          <RecordForm
            key={form.id}
            initial={form}
            records={records}
            t={t}
            onDirty={setDirty}
            onSave={async (r) => {
              const saved = await persist(r);
              setForm(saved);
              return saved;
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={auth}
        onOpenChange={setAuth}
        title={t(authMode === "signup" ? "Create account" : "Sign in")}
      >
        {configured ? (
          <form
            className="auth-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthBusy(true);
              setError("");
              const fd = new FormData(e.currentTarget);
              const db = browserClient();
              const credentials = {
                email: String(fd.get("email")),
                password: String(fd.get("password")),
              };
              try {
                const result =
                  authMode === "signup"
                    ? await db.auth.signUp(credentials)
                    : await db.auth.signInWithPassword(credentials);
                if (result.error) throw result.error;
                if (authMode === "signup" && !result.data.session)
                  setNotice(
                    "Check your email to confirm your account, then sign in.",
                  );
                setAuth(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setAuthBusy(false);
              }
            }}
          >
            <p className="muted">
              {lang === "fr"
                ? "Un espace privé pour vos idées, sur tous vos appareils."
                : "A private home for your ideas, on every device."}
            </p>
            <label className="field">
              {t("Email")}
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <label className="field">
              {t("Password")}
              <input
                type="password"
                name="password"
                autoComplete={
                  authMode === "signup" ? "new-password" : "current-password"
                }
                minLength={8}
                required
              />
            </label>
            <Button disabled={authBusy}>
              {t(authMode === "signup" ? "Create account" : "Sign in")}
            </Button>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setAuthMode(authMode === "signup" ? "signin" : "signup")
              }
            >
              {t(authMode === "signup" ? "Sign in" : "Create account")}
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="setup-notice">
            <p>{t("Database setup needed")}</p>
            <p>
              Follow the setup instructions in Settings to connect Supabase.
              Accounts and saved data require that connection.
            </p>
            <Button
              onClick={() => {
                setAuth(false);
                go("Settings");
              }}
            >
              {t("Settings")}
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </Dialog>
      <Dialog
        open={Boolean(exportItems)}
        onOpenChange={(open) => {
          if (!open && !exportBusy) setExportItems(null);
        }}
        title={t("Export PDF")}
      >
        <p className="muted">
          {t("Download your saved notes, beautifully organized.")}
        </p>
        <h3>{t("Choose chapters")}</h3>
        <div className="export-list">
          {exportItems?.map((r) => (
            <label key={r.id}>
              <input
                type="checkbox"
                checked={exportIds.includes(r.id)}
                onChange={(e) =>
                  setExportIds(
                    e.target.checked
                      ? [...exportIds, r.id]
                      : exportIds.filter((id) => id !== r.id),
                  )
                }
              />
              {r.title}
            </label>
          ))}
        </div>
        <h3>{t("Export sections")}</h3>
        <div className="export-options">
          {[
            ...new Set(exportItems?.flatMap((r) => sections[r.kind]) ?? []),
          ].map((k) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={exportSections.includes(k)}
                onChange={(e) =>
                  setExportSections(
                    e.target.checked
                      ? [...exportSections, k]
                      : exportSections.filter((v) => v !== k),
                  )
                }
              />
              {t(fields[k as Field])}
            </label>
          ))}
        </div>
        <p className="footnote">
          {t(
            "Save your changes before exporting, or export the last saved version from the reading view.",
          )}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button
          disabled={exportBusy || !exportIds.length}
          onClick={downloadPdf}
        >
          <Download size={16} />
          {t(exportBusy ? "Generating…" : "Generate PDF")}
        </Button>
      </Dialog>
      <Dialog
        open={Boolean(backup)}
        onOpenChange={(open) => {
          if (!open && !importBusy) setBackup(null);
        }}
        title={t("Import backup")}
      >
        {backup && (
          <>
            <p>
              {backup.records.length} records · {backup.events.length} review
              events
            </p>
            <p>
              {
                backup.records.filter((r) => records.some((v) => v.id === r.id))
                  .length
              }{" "}
              existing records will be skipped. New records will be added in one
              transaction. Nothing will be overwritten. Source links and review
              history are preserved.
            </p>
            <Button disabled={importBusy} onClick={importConfirm}>
              {importBusy ? "Importing…" : t("Import backup")}
            </Button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </Dialog>
    </div>
  );
}
