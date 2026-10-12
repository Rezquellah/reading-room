"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  Languages,
  Brain,
  Sprout,
  Search,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Sun,
  Moon,
  X,
  Grid2X2,
  List,
  Heart,
  FileText,
  Feather,
  LogOut,
  Download,
  Check,
  Trash2,
  Pencil,
  Menu,
  Quote,
  ChevronLeft,
  Copy,
} from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import {
  type Entry,
  type Workspace,
  progress,
  text,
  plainText,
} from "@/lib/model";
import { demoEntries, demoWorkspaces } from "@/lib/demo";
import EntryForm from "./entry-form";
import Insights from "./insights";
const Editor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => <div className="skeleton">Opening your writing space…</div>,
});
type View =
  | "Dashboard"
  | "Library"
  | "Vocabulary"
  | "Review"
  | "Practice"
  | "Journal"
  | "Search"
  | "Settings";
const nav = [
  ["Dashboard", LayoutDashboard],
  ["Library", Library],
  ["Vocabulary", Languages],
  ["Review", Brain],
  ["Practice", Sprout],
  ["Journal", Feather],
  ["Search", Search],
] as const;
type Form = {
  kind: Entry["kind"];
  entry?: Entry;
  parent?: string;
  initial?: string;
};
async function api(path: string, body?: unknown) {
  const r = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const v = await r.json();
  if (!r.ok) throw new Error(v.error ?? "Something went wrong. Please retry.");
  return v;
}
export default function Room({
  configured,
  email,
}: {
  configured: boolean;
  email: string | null;
}) {
  const [view, setView] = useState<View>("Dashboard"),
    [workspaces, setWorkspaces] = useState<Workspace[]>([]),
    [entries, setEntries] = useState<Entry[]>([]),
    [reviews, setReviews] = useState<
      { card_id: string; reviewed_at: string; rating: number }[]
    >([]),
    [workspace, setWorkspace] = useState("all"),
    [demo, setDemo] = useState(false),
    [loading, setLoading] = useState(Boolean(email)),
    [error, setError] = useState(""),
    [form, setForm] = useState<Form | null>(null),
    [workspaceForm, setWorkspaceForm] = useState(false),
    [auth, setAuth] = useState<"login" | "signup" | "reset" | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState("Overview"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("All statuses"),
    [kind, setKind] = useState("All reading"),
    [sort, setSort] = useState("Recently added"),
    [list, setList] = useState(false),
    [dark, setDark] = useState(false),
    [mobile, setMobile] = useState(false),
    [revealed, setRevealed] = useState(false),
    [session, setSession] = useState<string[] | null>(null),
    [reviewed, setReviewed] = useState(0),
    [busy, setBusy] = useState(false),
    [reverse, setReverse] = useState(false),
    [locale, setLocale] = useState("en"),
    [favorites, setFavorites] = useState(false),
    [since, setSince] = useState("");
  const entryRef = useRef(entries);
  useEffect(() => {
    entryRef.current = entries;
  }, [entries]);
  async function load() {
    setLoading(true);
    try {
      const v = await api("/api/data");
      setWorkspaces(v.workspaces);
      setEntries(v.entries);
      setReviews(v.reviews);
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    queueMicrotask(() => {
      if (email) void load();
      setDark(localStorage.getItem("reading-theme") === "dark");
      setLocale(localStorage.getItem("reading-locale") ?? "en");
    });
  }, [email]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("reading-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setView("Search");
        setSelected(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const current = workspaces.find((w) => w.id === workspace),
    scoped = entries.filter(
      (e) => workspace === "all" || e.workspace_id === workspace,
    ),
    books = scoped.filter((e) => e.kind === "book" && !e.data.archived),
    articles = scoped.filter((e) => e.kind === "article" && !e.data.archived),
    notes = scoped.filter((e) => e.kind === "note"),
    vocab = scoped.filter((e) => e.kind === "vocabulary"),
    cards = scoped.filter((e) => e.kind === "card"),
    due = cards.filter(
      (e) =>
        !e.data.schedule ||
        new Date((e.data.schedule as { due: string }).due) <= new Date(),
    ),
    item = entries.find((e) => e.id === selected);
  function navigate(v: View) {
    setView(v);
    setSelected(null);
    setMobile(false);
    setSession(null);
    setQuery("");
    setStatus("All statuses");
    setKind("All reading");
    setFavorites(false);
    setSince("");
  }
  function open(e: Entry) {
    setSelected(e.id);
    setTab(e.kind === "note" || e.kind === "journal" ? "Notes" : "Overview");
  }
  function guard() {
    if (!email || demo) {
      setAuth("login");
      return false;
    }
    return true;
  }
  function add(kind: Entry["kind"], parent?: string, initial?: string) {
    if (!guard()) return;
    if (!workspaces.length) {
      setWorkspaceForm(true);
      return;
    }
    setForm({ kind, parent, initial });
  }
  async function save(
    value: Omit<Entry, "id" | "created_at" | "updated_at"> | Entry,
  ) {
    if (!guard()) throw new Error("Sign in to save");
    const old =
      "id" in value
        ? entryRef.current.find((e) => e.id === value.id)
        : undefined;
    const result = await api("/api/data", {
      operation: "entry",
      value: {
        ...value,
        updated_at:
          old?.updated_at ??
          ("updated_at" in value ? value.updated_at : undefined),
      },
    });
    setEntries((all) => {
      const next = all.some((e) => e.id === result.id)
        ? all.map((e) => (e.id === result.id ? result : e))
        : [...all, result];
      entryRef.current = next;
      return next;
    });
    return result as Entry;
  }
  async function remove(e: Entry) {
    if (
      !guard() ||
      !confirm(
        `Delete “${e.title}” and all its linked chapters, notes, vocabulary, and cards? This cannot be undone.`,
      )
    )
      return;
    try {
      await api("/api/data", { operation: "delete", id: e.id });
      setSelected(null);
      await load();
    } catch (e) {
      setError(String(e));
    }
  }
  function descendants(id: string): Entry[] {
    const children = entries.filter((e) => e.parent_id === id);
    return children.flatMap((e) => [e, ...descendants(e.id)]);
  }
  async function exportPDF(target?: Entry) {
    if (demo) {
      setError("Sign in and add your own content to export.");
      return;
    }
    const params = new URLSearchParams({
      workspace: workspace,
      scope: target?.id ?? view.toLowerCase(),
      paper: localStorage.getItem("reading-paper") ?? "A4",
      style: localStorage.getItem("reading-print") ?? "styled",
    });
    window.open(`/api/pdf?${params}`, "_blank", "noopener");
  }
  const cover = (e: Entry, small = false) => (
    <div
      className={`book-cover ${small ? "small" : ""} ${
        text(e, "coverStyle") ||
        ["cream", "green", "rust"][
          Math.max(
            0,
            books.findIndex((b) => b.id === e.id),
          ) % 3
        ]
      }`}
    >
      {text(e, "cover") ? (
        <img src={text(e, "cover")} alt={`${e.title} cover`} />
      ) : (
        <>
          <span className="cover-author">
            {text(e, "author") || "YOUR NEXT CHAPTER"}
          </span>
          <strong>{e.title}</strong>
          <div className="cover-art">
            <span />
            <span />
            <span />
          </div>
          <span className="cover-edition">THE READING ROOM COLLECTION</span>
        </>
      )}
    </div>
  );
  const card = (e: Entry) => (
    <button className="book-card" key={e.id} onClick={() => open(e)}>
      {cover(e)}
      <div className="book-info">
        <div className="row">
          <span className="tag">{text(e, "category") || e.kind}</span>
          {Boolean(e.data.favorite) && <Heart size={14} fill="currentColor" />}
        </div>
        <h3>{e.title}</h3>
        <p>{text(e, "author") || "Unknown author"}</p>
        <div className="progress">
          <i
            style={{
              width: `${progress(Number(e.data.current_page || e.data.current_chapter), Number(e.data.total_pages || e.data.total_chapters))}%`,
            }}
          />
        </div>
        <div className="row muted">
          <span>{text(e, "status") || "Want to Read"}</span>
          <span>
            {progress(
              Number(e.data.current_page || e.data.current_chapter),
              Number(e.data.total_pages || e.data.total_chapters),
            )}
            %
          </span>
        </div>
      </div>
    </button>
  );
  const empty = (title: string, description: string, action?: () => void) => (
    <div className="empty">
      <BookOpen size={34} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="primary" onClick={action}>
          <Plus size={16} />
          Start here
        </button>
      )}
    </div>
  );
  const rows = (items: Entry[]) => (
    <div className="entry-list">
      {items.map((e) => (
        <button key={e.id} onClick={() => open(e)} className="entry-row">
          <span className={`entry-icon ${e.kind}`}>
            <>
              {e.kind === "vocabulary" ? (
                <Languages size={21} />
              ) : e.kind === "card" ? (
                <Brain size={21} />
              ) : e.kind === "quote" ? (
                <Quote size={21} />
              ) : (
                <FileText size={21} />
              )}
            </>
          </span>
          <span>
            <strong>{e.title}</strong>
            <small>
              {text(e, "definition") ||
                text(e, "author") ||
                text(e, "plain_text").slice(0, 100) ||
                text(e, "status") ||
                e.kind}
              {e.parent_id &&
                ` · ${entries.find((p) => p.id === e.parent_id)?.title ?? "Source"}`}
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
      ))}
    </div>
  );
  const related = item ? descendants(item.id) : [];
  const filtered = scoped
    .filter(
      (e) =>
        (view === "Library"
          ? ["book", "article"].includes(e.kind)
          : view === "Vocabulary"
            ? e.kind === "vocabulary"
            : view === "Practice"
              ? e.kind === "action"
              : view === "Journal"
                ? e.kind === "journal"
                : true) &&
        !e.data.archived &&
        (!since || e.created_at.slice(0, 10) >= since) &&
        (!favorites || e.data.favorite) &&
        (kind === "All reading" || e.kind === kind.toLowerCase()) &&
        (status === "All statuses" || e.data.status === status) &&
        `${e.title} ${JSON.stringify(e.data)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Title A–Z"
        ? a.title.localeCompare(b.title)
        : b.created_at.localeCompare(a.created_at),
    );
  const activeCard = session?.length
    ? entries.find((e) => e.id === session[0])
    : undefined;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <NextLink className="brand" href="/" aria-label="Reading Room home">
          <span className="brand-mark">
            <BookOpen size={25} />
          </span>
          <span>
            reading
            <span className="brand-second">
              room<span className="brand-dot">.</span>
            </span>
          </span>
        </NextLink>
        <div className="workspace-label">YOUR SPACE</div>
        <select
          className="workspace-switch"
          aria-label="Current workspace"
          value={workspace}
          onChange={(e) => {
            setWorkspace(e.target.value);
            setSelected(null);
            setSession(null);
          }}
        >
          <option value="all">◉ All workspaces</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.icon} {w.name}
            </option>
          ))}
        </select>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={view === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>
                {locale === "fr"
                  ? {
                      Dashboard: "Accueil",
                      Library: "Bibliothèque",
                      Vocabulary: "Vocabulaire",
                      Review: "Révision",
                      Practice: "Pratique",
                      Journal: "Journal",
                      Search: "Recherche",
                    }[name]
                  : name}
              </span>
              {name === "Review" && due.length > 0 && <b>{due.length}</b>}
              {name === "Search" && <kbd>⌘ K</kbd>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>Read. Reflect. Remember.</span>
          <p>
            A little curiosity,
            <br />a lifetime of discovery.
          </p>
          <Sprout size={30} strokeWidth={1} />
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => navigate("Settings")}>
            <Settings size={18} />
            Settings & workspaces
          </button>
          <button onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}{" "}
            {dark ? "Light" : "Dark"} appearance
          </button>
          <div className="profile">
            <span className="avatar">
              {email ? email[0].toUpperCase() : "R"}
            </span>
            <span>
              <strong>{email?.split("@")[0] ?? "Your reading room"}</strong>
              <small>
                {demo
                  ? "Sample library"
                  : email
                    ? "Personal workspace"
                    : "Make yourself at home"}
              </small>
            </span>
            {email ? (
              <button
                aria-label="Sign out"
                onClick={async () => {
                  await api("/api/auth", { action: "logout" });
                  location.reload();
                }}
              >
                <LogOut size={17} />
              </button>
            ) : (
              <button aria-label="Sign in" onClick={() => setAuth("login")}>
                <ArrowUpRight size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-toggle"
            aria-label="Toggle navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            My reading room <ChevronRight size={13} />{" "}
            <span>{item?.title ?? view}</span>
          </div>
          <div className="top-actions">
            <span className="today">
              {new Intl.DateTimeFormat(locale, {
                month: "long",
                day: "numeric",
                weekday: "short",
              }).format(new Date())}
            </span>
            <button
              className="icon-button"
              aria-label="Search your library"
              onClick={() => navigate("Search")}
            >
              <Search size={19} />
            </button>
            <button className="primary" onClick={() => add("book")}>
              <Plus size={17} />
              Add reading
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            You’re exploring a sample library. Your personal library starts
            empty.
            <button
              onClick={() => {
                setDemo(false);
                setEntries([]);
                setWorkspaces([]);
                setSelected(null);
                if (email) void load();
              }}
            >
              Leave sample
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <main id="main" className="main-content">
          {loading ? (
            <div className="skeleton">Gathering your books and ideas…</div>
          ) : item ? (
            <>
              <button
                className="back-link"
                onClick={() => {
                  if (item.parent_id) {
                    const parent = entries.find((e) => e.id === item.parent_id);
                    if (parent) open(parent);
                    else setSelected(null);
                  } else setSelected(null);
                }}
              >
                <ChevronLeft size={16} />
                Back to {item.parent_id ? "source" : "library"}
              </button>
              <div className="detail-header">
                {item.kind === "book" && cover(item, true)}
                <div>
                  <span className="eyebrow">
                    {item.kind} ·{" "}
                    {workspaces.find((w) => w.id === item.workspace_id)?.name}
                  </span>
                  <h1>{item.title}</h1>
                  <p className="subtitle">
                    {text(item, "author") ||
                      text(item, "definition") ||
                      "A place to make this idea your own."}
                  </p>
                  <div className="row wrap">
                    <button
                      className="secondary"
                      onClick={() => {
                        if (guard()) setForm({ kind: item.kind, entry: item });
                      }}
                    >
                      <Pencil size={15} />
                      Edit details
                    </button>
                    <button
                      className="secondary"
                      onClick={() => void exportPDF(item)}
                    >
                      <Download size={15} />
                      Export / print
                    </button>
                    <button
                      className="icon-button"
                      title="Favorite"
                      aria-label="Favorite"
                      onClick={() =>
                        void save({
                          ...item,
                          data: { ...item.data, favorite: !item.data.favorite },
                        }).catch((e) => setError(String(e)))
                      }
                    >
                      <Heart
                        size={18}
                        fill={item.data.favorite ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Delete item"
                      onClick={() => void remove(item)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="tabs">
                {(item.kind === "book"
                  ? [
                      "Overview",
                      "Chapters",
                      "Notes",
                      "Vocabulary",
                      "Quotes",
                      "Review",
                      "Practice",
                    ]
                  : item.kind === "article" || item.kind === "chapter"
                    ? [
                        "Overview",
                        "Notes",
                        "Vocabulary",
                        "Quotes",
                        "Review",
                        "Practice",
                      ]
                    : ["note", "journal"].includes(item.kind)
                      ? ["Notes"]
                      : ["Overview"]
                ).map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tab === "Overview" && (
                <div className="detail-columns">
                  <section className="panel">
                    <h2>
                      {item.kind === "vocabulary"
                        ? "A word worth keeping"
                        : "About this reading"}
                    </h2>
                    {Object.entries(item.data)
                      .filter(
                        ([k, v]) =>
                          typeof v === "string" &&
                          v &&
                          !["cover", "plain_text", "coverStyle"].includes(k),
                      )
                      .map(([k, v]) => (
                        <div className="detail-field" key={k}>
                          <span>{k.replaceAll("_", " ")}</span>
                          <p>{String(v)}</p>
                        </div>
                      ))}
                    {["book", "article", "chapter"].includes(item.kind) && (
                      <button
                        className="primary"
                        onClick={() => add("note", item.id)}
                      >
                        <Feather size={17} />
                        Write a note
                      </button>
                    )}
                    {["vocabulary", "quote"].includes(item.kind) && (
                      <button
                        className="primary"
                        onClick={() =>
                          add(
                            "card",
                            item.id,
                            text(item, "definition") || text(item, "quotation"),
                          )
                        }
                      >
                        <Brain size={17} />
                        Create recall card
                      </button>
                    )}
                    {item.kind === "card" && <p>{text(item, "answer")}</p>}
                  </section>
                  <section className="panel">
                    <span className="eyebrow">MAKE IT MEANINGFUL</span>
                    <h2>Read with intention.</h2>
                    <p>
                      What would you like to understand, remember, or put into
                      practice?
                    </p>
                    <div className="mini-stat">
                      <span>Connected notes</span>
                      <strong>
                        {related.filter((e) => e.kind === "note").length}
                      </strong>
                    </div>
                    <div className="mini-stat">
                      <span>Words collected</span>
                      <strong>
                        {related.filter((e) => e.kind === "vocabulary").length}
                      </strong>
                    </div>
                    <div className="mini-stat">
                      <span>Recall cards</span>
                      <strong>
                        {related.filter((e) => e.kind === "card").length}
                      </strong>
                    </div>
                    {["book", "article"].includes(item.kind) && (
                      <button
                        className="secondary"
                        onClick={() => {
                          void save({
                            ...item,
                            data: {
                              ...item.data,
                              archived: !item.data.archived,
                            },
                          })
                            .then(() => setSelected(null))
                            .catch((e) => setError(String(e)));
                        }}
                      >
                        Archive reading
                      </button>
                    )}
                  </section>
                </div>
              )}
              {tab === "Notes" &&
                (["note", "journal"].includes(item.kind) ? (
                  <>
                    <div className="row wrap note-actions">
                      <button
                        className="secondary"
                        onClick={() =>
                          void save({
                            kind: item.kind,
                            title: `${item.title} (copy)`,
                            workspace_id: item.workspace_id,
                            parent_id: item.parent_id,
                            data: item.data,
                          })
                            .then((e) => e && open(e))
                            .catch((e) => setError(String(e)))
                        }
                      >
                        <Copy size={15} />
                        Duplicate note
                      </button>
                      <label>
                        Move to
                        <select
                          value={item.parent_id ?? ""}
                          onChange={(e) =>
                            void save({
                              ...item,
                              parent_id: e.target.value || null,
                            }).catch((e) => setError(String(e)))
                          }
                        >
                          <option value="">Workspace journal</option>
                          {entries
                            .filter(
                              (e) =>
                                e.workspace_id === item.workspace_id &&
                                ["book", "article", "chapter"].includes(e.kind),
                            )
                            .map((e) => (
                              <option value={e.id} key={e.id}>
                                {e.title}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    <Editor
                      key={item.id}
                      id={item.id}
                      content={
                        (item.data.content as JSONContent) ?? {
                          type: "doc",
                          content: [{ type: "paragraph" }],
                        }
                      }
                      onSave={async (content) => {
                        await save({
                          ...entryRef.current.find((e) => e.id === item.id)!,
                          data: {
                            ...entryRef.current.find((e) => e.id === item.id)!
                              .data,
                            content,
                            plain_text: plainText(content),
                          },
                        });
                      }}
                      onCard={(selection) => add("card", item.id, selection)}
                    />
                  </>
                ) : (
                  <>
                    <div className="section-heading">
                      <h2>Your notes & reflections</h2>
                      <button
                        className="secondary"
                        onClick={() => add("note", item.id)}
                      >
                        <Plus size={16} />
                        New note
                      </button>
                    </div>
                    {related.some((e) => e.kind === "note")
                      ? rows(related.filter((e) => e.kind === "note"))
                      : empty(
                          "Let your ideas take shape",
                          "Write freely or start with a structured learning template.",
                          () => add("note", item.id),
                        )}
                  </>
                ))}
              {[
                "Chapters",
                "Vocabulary",
                "Quotes",
                "Review",
                "Practice",
              ].includes(tab) &&
                (() => {
                  const type = (
                    {
                      Chapters: "chapter",
                      Vocabulary: "vocabulary",
                      Quotes: "quote",
                      Review: "card",
                      Practice: "action",
                    } as const
                  )[tab as "Chapters"];
                  const collection = related
                    .filter((e) => e.kind === type)
                    .sort(
                      (a, b) =>
                        Number(a.data.order ?? 0) - Number(b.data.order ?? 0),
                    );
                  return (
                    <>
                      <div className="section-heading">
                        <h2>{tab}</h2>
                        <button
                          className="secondary"
                          onClick={() => add(type, item.id)}
                        >
                          <Plus size={16} />
                          Add {type}
                        </button>
                      </div>
                      {collection.length
                        ? rows(collection)
                        : empty(
                            `Your ${tab.toLowerCase()} will live here`,
                            "Capture something meaningful from this reading.",
                            () => add(type, item.id),
                          )}
                      {tab === "Review" && collection.length > 0 && (
                        <button
                          className="primary"
                          onClick={() => {
                            setSelected(null);
                            setView("Review");
                            setSession(
                              collection
                                .filter(
                                  (e) =>
                                    !e.data.schedule ||
                                    new Date(
                                      (e.data.schedule as { due: string }).due,
                                    ) <= new Date(),
                                )
                                .map((e) => e.id),
                            );
                            setReviewed(0);
                          }}
                        >
                          Review due cards
                        </button>
                      )}
                    </>
                  );
                })()}
            </>
          ) : view === "Dashboard" ? (
            <>
              <div className="page-intro">
                <div>
                  <span className="eyebrow">
                    A LITTLE READING. A LITTLE GROWING.
                  </span>
                  <h1>
                    {locale === "fr"
                      ? "Bienvenue dans votre bibliothèque."
                      : "Welcome to your reading room."}
                  </h1>
                  <p className="subtitle">
                    A quiet place for big ideas. What will you discover today?
                  </p>
                </div>
                <div className="intro-flower">✳</div>
              </div>
              {!email && !demo && (
                <div className="welcome-banner">
                  <div>
                    <span className="eyebrow">
                      YOUR NEXT CHAPTER STARTS HERE
                    </span>
                    <h2>
                      Build a library.
                      <br />
                      Keep the ideas that change you.
                    </h2>
                    <p>
                      Books, articles, thoughtful notes, and a gentle rhythm of
                      remembering.
                    </p>
                    <div className="row wrap">
                      <button
                        className="primary"
                        onClick={() => setAuth("signup")}
                      >
                        Create your account <ArrowRight size={17} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setDemo(true);
                          setWorkspaces(demoWorkspaces);
                          setEntries(demoEntries);
                        }}
                      >
                        Explore sample library <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="welcome-books">
                    <span>
                      READ
                      <br />
                      <i>deeply.</i>
                    </span>
                    <span>
                      THINK
                      <br />
                      <i>freely.</i>
                    </span>
                    <span>
                      REMEMBER
                      <br />
                      <i>longer.</i>
                    </span>
                  </div>
                </div>
              )}
              {email &&
                !workspaces.length &&
                empty(
                  "Make room for your first language",
                  "Create an English, French, or any other language workspace.",
                  () => setWorkspaceForm(true),
                )}
              <div className="stat-grid">
                {[
                  [
                    BookOpen,
                    books.filter((e) => text(e, "status") === "Reading").length,
                    "Books in progress",
                    "One page at a time",
                  ],
                  [
                    Feather,
                    notes.length,
                    "Ideas captured",
                    "Your growing perspective",
                  ],
                  [
                    Languages,
                    vocab.length,
                    "Words collected",
                    "A richer way to express",
                  ],
                  [
                    Brain,
                    due.length,
                    "Ready to remember",
                    "Make knowledge last",
                  ],
                ].map(([Icon, n, label, caption]) => {
                  const I = Icon as typeof BookOpen;
                  return (
                    <div className="stat" key={String(label)}>
                      <I size={20} strokeWidth={1.5} />
                      <strong>{String(n).padStart(2, "0")}</strong>
                      <span>{String(label)}</span>
                      <small>{String(caption)}</small>
                    </div>
                  );
                })}
              </div>
              <div className="dashboard-columns">
                <div>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        PICK UP WHERE YOU LEFT OFF
                      </span>
                      <h2>On your reading table</h2>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("Library")}
                    >
                      View library <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="book-grid">
                    {books
                      .filter((e) => text(e, "status") === "Reading")
                      .slice(0, 3)
                      .map(card)}
                  </div>
                  {!books.filter((e) => text(e, "status") === "Reading")
                    .length &&
                    empty(
                      "The start of something good",
                      "Add the book you’re reading and give your ideas a home.",
                      () => add("book"),
                    )}
                  <div className="section-heading lower">
                    <h2>Fresh perspectives</h2>
                    <button
                      className="text-button"
                      onClick={() => {
                        navigate("Library");
                        setKind("Article");
                      }}
                    >
                      All articles <ArrowRight size={16} />
                    </button>
                  </div>
                  {articles.length
                    ? rows(articles.slice(0, 3))
                    : empty(
                        "An article can change your mind",
                        "Save something worth reading.",
                        () => add("article"),
                      )}
                </div>
                <div className="dashboard-rail">
                  <section className="review-panel">
                    <span className="eyebrow">REVIEW & REMEMBER</span>
                    <div className="review-orbit">
                      <Brain size={35} strokeWidth={1} />
                      <span>✦</span>
                    </div>
                    <h2>
                      A little recall.
                      <br />A lasting impression.
                    </h2>
                    <p>
                      {due.length
                        ? `${due.length} ${due.length === 1 ? "idea is" : "ideas are"} ready for a fresh look.`
                        : "Your next insight is worth remembering."}{" "}
                      A few thoughtful minutes go a long way.
                    </p>
                    <button onClick={() => navigate("Review")}>
                      Visit your review room <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className="quote-panel">
                    <Quote size={24} strokeWidth={1} />
                    <span className="eyebrow">A THOUGHT TO SIT WITH</span>
                    <blockquote>
                      {scoped.find((e) => e.kind === "quote")
                        ? text(
                            scoped.find((e) => e.kind === "quote")!,
                            "quotation",
                          )
                        : "Reading is only the beginning. Remembering and applying knowledge is the real goal."}
                    </blockquote>
                    <small>
                      {scoped.find((e) => e.kind === "quote")
                        ? text(
                            scoped.find((e) => e.kind === "quote")!,
                            "attribution",
                          )
                        : "THE READING ROOM PHILOSOPHY"}
                    </small>
                  </section>
                </div>
              </div>
              <div className="section-heading lower">
                <h2>Ideas to return to</h2>
                <button
                  className="text-button"
                  onClick={() => navigate("Search")}
                >
                  Explore your knowledge <ArrowRight size={16} />
                </button>
              </div>
              {notes.length ? (
                rows(notes.slice(-3).reverse())
              ) : (
                <p className="muted">
                  Your saved notes will find their way back to you here.
                </p>
              )}
              <Insights entries={scoped} reviews={reviews} locale={locale} />
            </>
          ) : [
              "Library",
              "Vocabulary",
              "Practice",
              "Journal",
              "Search",
            ].includes(view) ? (
            <>
              <div className="page-intro">
                <div>
                  <span className="eyebrow">
                    {current?.name ?? "ACROSS YOUR WORKSPACES"}
                  </span>
                  <h1>
                    {
                      {
                        Library: "Your personal library.",
                        Vocabulary: "Words worth keeping.",
                        Practice: "Put your ideas into motion.",
                        Journal: "A record of becoming.",
                        Search: "Rediscover what you know.",
                      }[view as "Library"]
                    }
                  </h1>
                  <p className="subtitle">
                    {
                      {
                        Library:
                          "Every book is a conversation. Every article, a new possibility.",
                        Vocabulary:
                          "Collect a word. Find its meaning. Make it yours.",
                        Practice:
                          "Small actions turn good ideas into a different way of living.",
                        Journal:
                          "Connect the dots between what you read and who you are.",
                        Search:
                          "Follow a thought across your books, notes, and discoveries.",
                      }[view as "Library"]
                    }
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    add(
                      view === "Vocabulary"
                        ? "vocabulary"
                        : view === "Practice"
                          ? "action"
                          : view === "Journal"
                            ? "journal"
                            : "book",
                    )
                  }
                >
                  <Plus size={17} />
                  Add{" "}
                  {view === "Vocabulary"
                    ? "word"
                    : view === "Practice"
                      ? "action"
                      : view === "Journal"
                        ? "entry"
                        : "reading"}
                </button>
              </div>
              <div className="filterbar">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Search content"
                    placeholder={
                      view === "Search"
                        ? "Search every idea, word, author, or tag…"
                        : "Search your collection…"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {(view === "Library" || view === "Search") && (
                  <select
                    aria-label="Reading type"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    {(view === "Search"
                      ? [
                          "All reading",
                          "Book",
                          "Article",
                          "Chapter",
                          "Note",
                          "Vocabulary",
                          "Quote",
                          "Card",
                          "Action",
                          "Journal",
                        ]
                      : ["All reading", "Book", "Article"]
                    ).map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                )}
                {view === "Search" && (
                  <>
                    <input
                      style={{ width: 150 }}
                      type="date"
                      aria-label="Added on or after"
                      value={since}
                      onChange={(e) => setSince(e.target.value)}
                    />
                    <select
                      aria-label="Reading status"
                      style={{ width: 150 }}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {[
                        "All statuses",
                        "Want to Read",
                        "Reading",
                        "Completed",
                        "Paused",
                        "Abandoned",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </>
                )}
                <select
                  aria-label="Sort results"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option>Recently added</option>
                  <option>Title A–Z</option>
                </select>
                <button
                  className={`icon-button ${favorites ? "selected" : ""}`}
                  aria-label="Show favorites"
                  onClick={() => setFavorites(!favorites)}
                >
                  <Heart size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Toggle list view"
                  onClick={() => setList(!list)}
                >
                  {list ? <Grid2X2 size={18} /> : <List size={18} />}
                </button>
              </div>
              {view === "Library" && (
                <div className="row wrap collection-tabs">
                  <div className="tabs">
                    {[
                      "All statuses",
                      "Reading",
                      "Want to Read",
                      "Completed",
                      "Paused",
                      "Abandoned",
                    ].map((s) => (
                      <button
                        key={s}
                        className={status === s ? "active" : ""}
                        onClick={() => setStatus(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => add("article")}
                  >
                    + Add article
                  </button>
                </div>
              )}
              <div className="section-heading">
                <span className="muted">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "discovery" : "discoveries"}
                </span>
                {["Vocabulary", "Journal"].includes(view) && (
                  <button
                    className="text-button"
                    onClick={() => void exportPDF()}
                  >
                    <Download size={16} />
                    Export collection
                  </button>
                )}
              </div>
              {filtered.length ? (
                view === "Library" && !list ? (
                  <div className="book-grid library-grid">
                    {filtered.map(card)}
                  </div>
                ) : (
                  rows(filtered)
                )
              ) : (
                empty(
                  "A little space for discovery",
                  "Add something new or try a different search.",
                  () =>
                    add(
                      view === "Vocabulary"
                        ? "vocabulary"
                        : view === "Practice"
                          ? "action"
                          : view === "Journal"
                            ? "journal"
                            : "book",
                    ),
                )
              )}
            </>
          ) : view === "Review" ? (
            <>
              <div className="page-intro">
                <div>
                  <span className="eyebrow">KNOWLEDGE THAT STAYS WITH YOU</span>
                  <h1>Your review room.</h1>
                  <p className="subtitle">
                    Pause. Recall. Reconnect. You know more than you think.
                  </p>
                </div>
                <button className="secondary" onClick={() => add("card")}>
                  <Plus size={16} />
                  Create card
                </button>
              </div>
              {session !== null ? (
                <section className="recall-card">
                  <div className="row">
                    <span className="eyebrow">
                      {reviewed} REVIEWED · {session.length} REMAINING
                    </span>
                    <button onClick={() => setSession(null)}>
                      End session
                    </button>
                  </div>
                  {activeCard ? (
                    <>
                      <span className="tag">
                        {entries.find((e) => e.id === activeCard.parent_id)
                          ?.title ?? "Your knowledge"}
                      </span>
                      <h2>
                        {reverse
                          ? text(activeCard, "answer")
                          : activeCard.title}
                      </h2>
                      {revealed ? (
                        <>
                          <div className="answer">
                            {reverse
                              ? activeCard.title
                              : text(activeCard, "answer")}
                          </div>
                          <p className="muted">How well did you remember?</p>
                          <div className="rating-buttons">
                            {["Again", "Hard", "Good", "Easy"].map(
                              (rating, i) => (
                                <button
                                  disabled={busy}
                                  key={rating}
                                  onClick={async () => {
                                    if (!guard()) return;
                                    setBusy(true);
                                    try {
                                      await api("/api/review", {
                                        id: activeCard.id,
                                        rating: i + 1,
                                        updated_at: activeCard.updated_at,
                                      });
                                      setSession(session.slice(1));
                                      setReviewed(reviewed + 1);
                                      setRevealed(false);
                                      await load();
                                    } catch (e) {
                                      setError(String(e));
                                    } finally {
                                      setBusy(false);
                                    }
                                  }}
                                >
                                  {rating}
                                </button>
                              ),
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="muted">
                            Give yourself a moment to recall before revealing.
                          </p>
                          <button
                            className="primary"
                            onClick={() => setRevealed(true)}
                          >
                            Reveal answer
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Check size={40} />
                      <h2>A little more connected.</h2>
                      <p>You revisited {reviewed} ideas. Let them settle in.</p>
                      <button
                        className="primary"
                        onClick={() => setSession(null)}
                      >
                        Back to review room
                      </button>
                    </>
                  )}
                </section>
              ) : (
                <>
                  <div className="stat-grid">
                    {[
                      [due.length, "Due now"],
                      [
                        cards.filter((e) => !e.data.schedule).length,
                        "New ideas",
                      ],
                      [
                        reviews.filter((r) =>
                          scoped.some((e) => e.id === r.card_id),
                        ).length,
                        "Reviews completed",
                      ],
                      [cards.length, "Cards collected"],
                    ].map(([n, l]) => (
                      <div className="stat" key={l}>
                        <strong>{n}</strong>
                        <span>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="review-start panel">
                    <Brain size={42} strokeWidth={1} />
                    <h2>Make a little room for remembering.</h2>
                    <p>
                      Spaced repetition brings ideas back just when they need a
                      little attention.
                    </p>
                    <label className="inline-label">
                      <input
                        type="checkbox"
                        checked={reverse}
                        onChange={(e) => setReverse(e.target.checked)}
                      />
                      Reverse question and answer
                    </label>
                    <button
                      className="primary"
                      disabled={!due.length}
                      onClick={() => {
                        setSession(due.map((e) => e.id));
                        setRevealed(false);
                        setReviewed(0);
                      }}
                    >
                      Review {due.length} due cards <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="section-heading lower">
                    <h2>Your recall collection</h2>
                    <button
                      className="text-button"
                      onClick={() => void exportPDF()}
                    >
                      Export revision summary
                    </button>
                  </div>
                  {rows(cards)}
                </>
              )}
            </>
          ) : view === "Settings" ? (
            <>
              <div className="page-intro">
                <div>
                  <span className="eyebrow">MAKE YOURSELF AT HOME</span>
                  <h1>Your room, your rhythm.</h1>
                  <p className="subtitle">
                    A space that grows with your curiosity.
                  </p>
                </div>
              </div>
              <div className="settings-grid">
                <section className="panel">
                  <div className="section-heading">
                    <h2>Language workspaces</h2>
                    <button
                      className="icon-button"
                      aria-label="Create workspace"
                      onClick={() => {
                        if (guard()) {
                          setWorkspace("all");
                          setWorkspaceForm(true);
                        }
                      }}
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                  {workspaces.map((w) => (
                    <div className="workspace-row" key={w.id}>
                      <span style={{ background: w.color }}>{w.icon}</span>
                      <div>
                        <strong>{w.name}</strong>
                        <small>
                          {w.language} ·{" "}
                          {
                            entries.filter((e) => e.workspace_id === w.id)
                              .length
                          }{" "}
                          discoveries
                        </small>
                      </div>
                      <button
                        aria-label={`Edit ${w.name}`}
                        onClick={() => {
                          setWorkspace(w.id);
                          setWorkspaceForm(true);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  ))}
                </section>
                <section className="panel">
                  <h2>Reading preferences</h2>
                  <label>
                    Interface language
                    <select
                      value={locale}
                      onChange={(e) => {
                        setLocale(e.target.value);
                        localStorage.setItem("reading-locale", e.target.value);
                      }}
                    >
                      <option value="en">English</option>
                      <option value="fr">Français (navigation & dates)</option>
                    </select>
                  </label>
                  <label>
                    Paper size
                    <select
                      defaultValue="A4"
                      onChange={(e) =>
                        localStorage.setItem("reading-paper", e.target.value)
                      }
                    >
                      <option>A4</option>
                      <option>Letter</option>
                    </select>
                  </label>
                  <label>
                    Print appearance
                    <select
                      defaultValue="styled"
                      onChange={(e) =>
                        localStorage.setItem("reading-print", e.target.value)
                      }
                    >
                      <option value="styled">Warm editorial</option>
                      <option value="ink">Ink friendly</option>
                    </select>
                  </label>
                </section>
                <section className="panel">
                  <h2>Your knowledge, yours to keep.</h2>
                  <p>
                    Download a portable JSON backup of your workspaces, rich
                    notes, and review history. Image references remain linked to
                    your private storage.
                  </p>
                  <a
                    className="secondary"
                    href="/api/backup"
                    download
                    onClick={(event) => {
                      if (!guard()) event.preventDefault();
                    }}
                  >
                    <Download size={16} />
                    Download JSON backup
                  </a>
                  <label style={{ marginTop: 20 }}>
                    Restore a Reading Room 2.0 backup
                    <input
                      type="file"
                      accept="application/json,.json"
                      disabled={busy}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !guard()) return;
                        setBusy(true);
                        try {
                          const backup = JSON.parse(await file.text());
                          if (
                            !Array.isArray(backup.entries) ||
                            !Array.isArray(backup.workspaces)
                          )
                            throw new Error(
                              "Choose a Reading Room 2.0 JSON backup.",
                            );
                          if (
                            !confirm(
                              `Restore ${backup.entries.length} entries across ${backup.workspaces.length} workspaces? Existing IDs will be skipped, never overwritten.`,
                            )
                          )
                            return;
                          const result = await api("/api/backup", backup);
                          await load();
                          setError(
                            `Restored ${result.inserted} entries; skipped ${result.skipped} existing entries.`,
                          );
                        } catch (e) {
                          setError(String(e));
                        } finally {
                          setBusy(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </section>
                <section className="panel">
                  <h2>Archived reading</h2>
                  {scoped
                    .filter((e) => e.data.archived)
                    .map((e) => (
                      <div className="row" key={e.id}>
                        <span>{e.title}</span>
                        <button
                          onClick={() =>
                            void save({
                              ...e,
                              data: { ...e.data, archived: false },
                            }).catch((e) => setError(String(e)))
                          }
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  {!scoped.some((e) => e.data.archived) && (
                    <p>No archived books or articles.</p>
                  )}
                </section>
              </div>
            </>
          ) : null}
          <footer className="page-footer">
            <span>READING ROOM</span>
            <span>Not just read. Remembered.</span>
            <span>
              <Sprout size={15} /> Grow at your own pace.
            </span>
          </footer>
        </main>
      </div>
      <Dialog.Root
        open={Boolean(form)}
        onOpenChange={(v) => {
          if (!v) setForm(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog">
            <Dialog.Title>
              {form?.entry ? "Edit" : "A new"} {form?.kind}
            </Dialog.Title>
            <Dialog.Description>
              Give this discovery a place in your library.
            </Dialog.Description>
            <Dialog.Close className="dialog-close" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
            {form && (
              <EntryForm
                kind={form.kind}
                entry={form.entry}
                parent={form.parent}
                initial={form.initial}
                workspaces={workspaces}
                workspace={
                  item?.workspace_id ?? current?.id ?? workspaces[0]?.id
                }
                onSave={async (value) => {
                  const e = await save(value);
                  setForm(null);
                  if (e) open(e);
                }}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={workspaceForm} onOpenChange={setWorkspaceForm}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog compact">
            <Dialog.Title>
              {view === "Settings" && current
                ? "Customize workspace"
                : "A language. A new perspective."}
            </Dialog.Title>
            <Dialog.Description>
              Create a home for everything you read in this language.
            </Dialog.Description>
            <Dialog.Close className="dialog-close" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
            <form
              className="entry-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!guard()) return;
                setBusy(true);
                try {
                  const f = Object.fromEntries(new FormData(e.currentTarget));
                  const w = await api("/api/data", {
                    operation: "workspace",
                    value: {
                      ...f,
                      ...(view === "Settings" && current
                        ? { id: current.id }
                        : {}),
                    },
                  });
                  setWorkspaces((all) =>
                    all.some((a) => a.id === w.id)
                      ? all.map((a) => (a.id === w.id ? w : a))
                      : [...all, w],
                  );
                  setWorkspace(w.id);
                  setWorkspaceForm(false);
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="span-two">
                Workspace name
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={view === "Settings" ? current?.name : ""}
                  placeholder="My English library"
                />
              </label>
              <label>
                Language code
                <input
                  name="language"
                  required
                  minLength={2}
                  maxLength={30}
                  defaultValue={
                    view === "Settings" ? (current?.language ?? "en") : "en"
                  }
                  placeholder="en, fr, ar, es…"
                />
              </label>
              <label>
                Icon
                <input
                  name="icon"
                  maxLength={10}
                  defaultValue={
                    view === "Settings" ? (current?.icon ?? "📚") : "📚"
                  }
                />
              </label>
              <label>
                Color
                <input
                  type="color"
                  name="color"
                  defaultValue={
                    view === "Settings"
                      ? (current?.color ?? "#355c4a")
                      : "#355c4a"
                  }
                />
              </label>
              <button disabled={busy} className="primary span-two">
                {busy ? "Saving…" : "Save workspace"}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={Boolean(auth)}
        onOpenChange={(v) => {
          if (!v) setAuth(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog compact">
            <Dialog.Title>
              {auth === "signup"
                ? "Your next chapter awaits."
                : auth === "reset"
                  ? "Find your way back."
                  : "Welcome back."}
            </Dialog.Title>
            <Dialog.Description>
              {configured
                ? "Your ideas deserve a place to stay."
                : "Connect Supabase to enable accounts and persistent storage."}
            </Dialog.Description>
            {error && (
              <p role="status" className="error">
                {error}
              </p>
            )}
            <Dialog.Close className="dialog-close" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
            <form
              className="entry-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const values = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  await api("/api/auth", { action: auth, ...values });
                  if (auth === "login") location.reload();
                  else
                    setError(
                      auth === "reset"
                        ? "Check your email for a recovery link."
                        : "Check your email to confirm your account, then sign in.",
                    );
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="span-two">
                Email
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                />
              </label>
              {auth !== "reset" && (
                <label className="span-two">
                  Password
                  <input
                    required
                    type="password"
                    name="password"
                    minLength={8}
                    autoComplete={
                      auth === "signup" ? "new-password" : "current-password"
                    }
                  />
                </label>
              )}
              <button
                disabled={!configured || busy}
                className="primary span-two"
              >
                {busy
                  ? "One moment…"
                  : auth === "signup"
                    ? "Create account"
                    : auth === "reset"
                      ? "Send recovery email"
                      : "Sign in"}
              </button>
            </form>
            <div className="row wrap auth-links">
              <button
                onClick={() => setAuth(auth === "signup" ? "login" : "signup")}
              >
                {auth === "signup"
                  ? "Already have an account? Sign in"
                  : "Create an account"}
              </button>
              <button onClick={() => setAuth("reset")}>Forgot password?</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
