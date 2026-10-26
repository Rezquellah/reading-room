"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, GraduationCap } from "lucide-react";
import type { Entry } from "@/lib/model";
import {
  parseStudyPack,
  studyEntries,
  studyPrompt,
  learningGoals,
  studyPreferencesSchema,
  type StudyPreferences,
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
  const [preferences, setPreferences] = useState<StudyPreferences>(() => {
    const saved = studyPreferencesSchema.safeParse(
      source.data.study_preferences,
    );
    return saved.success
      ? saved.data
      : studyPreferencesSchema.parse({
          explanationLanguage: language || "English",
        });
  });
  const [showHelp, setShowHelp] = useState(false);
  const [coachingEnabled, setCoachingEnabled] = useState(
    Boolean(preferences.coachingLanguage),
  );
  function preference<K extends keyof StudyPreferences>(
    key: K,
    value: StudyPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }
  const [raw, setRaw] = useState(""),
    [mode, setMode] = useState("pack");
  const [pack, setPack] = useState<StudyPack | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const prompt = studyPrompt(
    source.title,
    preferences.explanationLanguage,
    preferences.context,
    preferences,
  );
  async function savePreferences() {
    setBusy(true);
    setMessage("");
    try {
      const saved = studyPreferencesSchema.parse(preferences);
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: {
            ...source,
            data: { ...source.data, study_preferences: saved },
          },
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to save study preferences.");
      await onImported();
      setMessage(
        "Study preferences saved for this source. You can change them for any session.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save study preferences.",
      );
    } finally {
      setBusy(false);
    }
  }
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
            <fieldset
              className="study-stack"
              disabled={busy}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            >
              <p>
                Choose what you want from this session. You can change your goal
                whenever you study.
              </p>
              <label>
                Learning goal
                <select
                  aria-label="Learning goal"
                  value={preferences.learningGoal}
                  onChange={(e) =>
                    preference(
                      "learningGoal",
                      e.target.value as StudyPreferences["learningGoal"],
                    )
                  }
                >
                  {Object.entries(learningGoals).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
              <p>{learningGoals[preferences.learningGoal].description}</p>
              <button
                type="button"
                className="secondary"
                aria-expanded={showHelp}
                aria-controls={`study-help-${source.id}`}
                onClick={() => setShowHelp(!showHelp)}
              >
                Help me choose
              </button>
              {showHelp && (
                <div id={`study-help-${source.id}`}>
                  <p>
                    Not sure? Start with Understand. Choose Exam for assessment
                    practice, Apply for decisions and action, or Explore for
                    discussion and deeper questions.
                  </p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      preference("learningGoal", "understand");
                      setShowHelp(false);
                    }}
                  >
                    Start with Understand
                  </button>
                </div>
              )}
              <label>
                Topic familiarity
                <select
                  aria-label="Topic familiarity"
                  value={preferences.familiarity}
                  onChange={(e) =>
                    preference(
                      "familiarity",
                      e.target.value as StudyPreferences["familiarity"],
                    )
                  }
                >
                  {(["Beginner", "Some knowledge", "Advanced"] as const).map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Detail level
                <select
                  aria-label="Detail level"
                  value={preferences.depth}
                  onChange={(e) =>
                    preference(
                      "depth",
                      e.target.value as StudyPreferences["depth"],
                    )
                  }
                >
                  {(["Essentials", "Balanced", "In depth"] as const).map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Language coaching
                <select
                  aria-label="Language coaching"
                  value={coachingEnabled ? "on" : "off"}
                  onChange={(e) => {
                    setCoachingEnabled(e.target.value === "on");
                    preference(
                      "coachingLanguage",
                      e.target.value === "on" ? "English" : "",
                    );
                  }}
                >
                  <option value="off">Off — focus on the subject</option>
                  <option value="on">On — practise a language too</option>
                </select>
              </label>
              {coachingEnabled && (
                <label>
                  Language to practise
                  <input
                    value={preferences.coachingLanguage}
                    onChange={(e) =>
                      preference("coachingLanguage", e.target.value)
                    }
                    maxLength={100}
                  />
                </label>
              )}
              <label>
                Explanation language
                <input
                  value={preferences.explanationLanguage}
                  onChange={(e) =>
                    preference("explanationLanguage", e.target.value)
                  }
                  maxLength={100}
                />
              </label>
              <label>
                Personal context (optional)
                <input
                  value={preferences.context}
                  onChange={(e) => preference("context", e.target.value)}
                  placeholder="For example: I work in sales, or my exam covers chapters 1–4"
                  maxLength={1000}
                />
              </label>
              <button
                type="button"
                className="secondary"
                disabled={
                  busy ||
                  !preferences.explanationLanguage.trim() ||
                  (coachingEnabled && !preferences.coachingLanguage.trim())
                }
                onClick={() => void savePreferences()}
              >
                {busy ? "Saving…" : "Save preferences for this source"}
              </button>
              <label>
                Study prompt
                <textarea rows={9} readOnly value={prompt} />
              </label>
              <div className="row wrap">
                <button
                  className="primary"
                  disabled={
                    !preferences.explanationLanguage.trim() ||
                    (coachingEnabled && !preferences.coachingLanguage.trim())
                  }
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
            </fieldset>
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
