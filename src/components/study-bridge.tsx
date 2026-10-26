"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, GraduationCap } from "lucide-react";
import type { Entry } from "@/lib/model";
import {
  parseStudyPack,
  studyEntries,
  studyPrompt,
  type StudyPack,
} from "@/lib/study";

export default function StudyBridge({
  source,
  language,
  onImported,
}: {
  source: Entry;
  language: string;
  onImported: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [step, setStep] = useState("prepare");
  const [goal, setGoal] = useState(""),
    [studyLanguage, setStudyLanguage] = useState(language);
  const [englishCoaching, setEnglishCoaching] = useState(true);
  const [raw, setRaw] = useState(""),
    [mode, setMode] = useState("pack");
  const [pack, setPack] = useState<StudyPack | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const prompt = studyPrompt(
    source.title,
    studyLanguage,
    goal,
    englishCoaching,
  );
  const rows = pack
    ? [
        ...pack.notes.map((n, i) => ({
          key: `notes:${i}`,
          title: n.title,
          detail: n.text,
          label: "Note",
        })),
        ...pack.vocabulary.map((v, i) => ({
          key: `vocabulary:${i}`,
          title: v.word,
          detail: `${v.definition}\n${v.example}`,
          label: "Vocabulary",
        })),
        ...pack.cards.map((c, i) => ({
          key: `cards:${i}`,
          title: c.question,
          detail: c.answer,
          label: "Recall card",
        })),
      ]
    : [];
  async function importPack() {
    if (!pack || !selected.length || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const chosen = {
        ...pack,
        notes: pack.notes.filter((_, i) => selected.includes(`notes:${i}`)),
        vocabulary: pack.vocabulary.filter((_, i) =>
          selected.includes(`vocabulary:${i}`),
        ),
        cards: pack.cards.filter((_, i) => selected.includes(`cards:${i}`)),
      };
      const entries = await studyEntries(chosen, source);
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: 1,
          workspaces: [],
          entries,
          reviews: [],
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Import failed. You can retry safely.");
      await onImported();
      setMessage(
        `Saved ${result.inserted} items. Skipped ${result.skipped} existing items. Find notes and vocabulary under this source, and cards in Review.`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Import failed. Retry safely.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) setOpen(value);
      }}
    >
      <Dialog.Trigger asChild>
        <button className="secondary">
          <GraduationCap size={16} />
          Study with ChatGPT
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog study-dialog"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <Dialog.Title>Study there. Remember here.</Dialog.Title>
          <Dialog.Description>
            Use ChatGPT Study mode with your own subscription, then bring your
            learning back to {source.title}. No API key or extra AI charges from
            Reading Room.
          </Dialog.Description>
          <Dialog.Close asChild>
            <button
              className="dialog-close"
              aria-label="Close study workflow"
              disabled={busy}
            >
              <X size={20} />
            </button>
          </Dialog.Close>
          <div className="tabs">
            <button
              className={step === "prepare" ? "active" : ""}
              onClick={() => setStep("prepare")}
            >
              1. Prepare study session
            </button>
            <button
              className={step === "import" ? "active" : ""}
              onClick={() => setStep("import")}
            >
              2. Save your learning
            </button>
          </div>
          {step === "prepare" ? (
            <div className="study-stack">
              <p>
                Learn through practical lessons and real-life scenarios. Get
                feedback on your answers before moving to the next section.
              </p>
              <label>
                Study approach
                <select
                  value={englishCoaching ? "english" : "book"}
                  onChange={(e) =>
                    setEnglishCoaching(e.target.value === "english")
                  }
                >
                  <option value="english">
                    Book lessons + English coaching
                  </option>
                  <option value="book">Book lessons only</option>
                </select>
              </label>
              {englishCoaching && (
                <p>
                  Practice answering in English. Your tutor will explain your
                  corrections, suggest a professional rewrite, and teach useful
                  grammar and vocabulary alongside the book.
                </p>
              )}
              <label>
                Explanation language
                <input
                  value={studyLanguage}
                  onChange={(e) => setStudyLanguage(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                What do you want to understand?
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="For example: apply the chapter's ideas at work"
                  maxLength={1000}
                />
              </label>
              <label>
                Study prompt
                <textarea rows={9} readOnly value={prompt} />
              </label>
              <div className="row wrap">
                <button
                  className="primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(prompt);
                      setMessage("Study prompt copied.");
                    } catch {
                      setMessage("Select and copy the study prompt above.");
                    }
                  }}
                >
                  Copy study prompt
                </button>
                <a
                  className="secondary"
                  href="https://chatgpt.com/studymode"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open ChatGPT Study mode ↗
                </a>
              </div>
              <p>
                Paste the prompt into your existing ChatGPT conversation to
                continue where you left off, or start a new chat and upload your
                ebook there. Nothing is sent automatically. When you finish,
                ask: <strong>Export to Reading Room</strong>. Copy its JSON
                response and return to step 2.
              </p>
            </div>
          ) : (
            <div className="study-stack">
              <label>
                Import format
                <select
                  value={mode}
                  disabled={busy}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setPack(null);
                    setMessage("");
                  }}
                >
                  <option value="pack">ChatGPT study pack (JSON)</option>
                  <option value="plain">Plain notes</option>
                </select>
              </label>
              <label>
                {mode === "pack" ? "Paste the study pack" : "Paste your notes"}
                <textarea
                  rows={7}
                  value={raw}
                  maxLength={500000}
                  disabled={busy}
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setPack(null);
                    setMessage("");
                  }}
                />
              </label>
              <p>
                Up to 500 KB per study pack and 50,000 characters per note.
                Review explanations against your book before saving.
              </p>
              <label>
                Or choose a {mode === "pack" ? "JSON" : "text"} file
                <input
                  type="file"
                  accept={
                    mode === "pack"
                      ? ".json,application/json"
                      : ".txt,.md,text/plain"
                  }
                  disabled={busy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPack(null);
                    if (f.size > 500000) {
                      setMessage("Choose a file under 500 KB.");
                      return;
                    }
                    setRaw(await f.text());
                    setMessage("");
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="secondary"
                disabled={busy || !raw.trim()}
                onClick={() => {
                  try {
                    const parsed =
                      mode === "pack"
                        ? parseStudyPack(raw)
                        : parseStudyPack(
                            JSON.stringify({
                              format: "reading-room-study-v1",
                              notes: [
                                {
                                  title: `Study notes — ${source.title}`.slice(
                                    0,
                                    500,
                                  ),
                                  text: raw,
                                },
                              ],
                            }),
                          );
                    setPack(parsed);
                    setSelected([
                      ...parsed.notes.map((_, i) => `notes:${i}`),
                      ...parsed.vocabulary.map((_, i) => `vocabulary:${i}`),
                      ...parsed.cards.map((_, i) => `cards:${i}`),
                    ]);
                    setMessage("");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Preview import
              </button>
              {pack && (
                <>
                  <p>
                    <strong>Destination: {source.title}</strong>. Select what to
                    keep. Existing items are never overwritten. Imported cards
                    start as new, with no invented review history.
                  </p>
                  <div className="study-preview">
                    {rows.map((r) => (
                      <label className="study-preview-row" key={r.key}>
                        <input
                          type="checkbox"
                          checked={selected.includes(r.key)}
                          disabled={busy}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, r.key]
                                : selected.filter((k) => k !== r.key),
                            )
                          }
                        />
                        <span>
                          <small>{r.label}</small>
                          <strong>{r.title}</strong>
                          <span>{r.detail}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="primary"
                    onClick={() => void importPack()}
                    disabled={busy || !selected.length}
                  >
                    {busy
                      ? "Saving…"
                      : `Save ${selected.length} selected items`}
                  </button>
                </>
              )}
            </div>
          )}
          {message && (
            <p role="status" className="study-message">
              {message}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
