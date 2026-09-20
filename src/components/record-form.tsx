"use client";
import { useEffect, useRef, useState } from "react";
import {
  RecordItem,
  Payload,
  fields,
  sections,
  recordSchema,
  Field,
  fold,
} from "@/lib/model";
import { Editor } from "./editor";
import { Button } from "./ui/button";
import { Check, ChevronDown, Save, AlertCircle } from "lucide-react";
export function RecordForm({
  initial,
  records,
  onSave,
  onDirty,
  t,
}: {
  initial: RecordItem;
  records: RecordItem[];
  onSave: (r: RecordItem) => Promise<RecordItem>;
  onDirty: (v: boolean) => void;
  t: (s: string) => string;
}) {
  const [draft, setDraft] = useState(initial),
    [state, setState] = useState(""),
    [error, setError] = useState("");
  const busy = useRef(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);
  function change(next: RecordItem) {
    setDraft(next);
    setDirty(true);
    onDirty(true);
    setState("Unsaved changes");
  }
  const data = <K extends keyof Payload>(key: K, v: Payload[K]) =>
    change({ ...draft, data: { ...draft.data, [key]: v } });
  function input(label: string, key: keyof Payload, type = "text") {
    return (
      <label className="field" key={key}>
        {t(label)}
        <input
          type={type}
          value={String(draft.data[key] ?? "")}
          onChange={(e) => data(key, e.target.value as never)}
        />
      </label>
    );
  }
  const duplicate =
    draft.kind === "vocabulary" &&
    records.some(
      (r) =>
        r.id !== draft.id &&
        r.kind === "vocabulary" &&
        r.language === draft.language &&
        fold(r.title) === fold(draft.title),
    );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setError("");
    const parsed = recordSchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
      return;
    }
    busy.current = true;
    setState("Saving…");
    try {
      const saved = await onSave(parsed.data);
      setDraft(saved);
      setDirty(false);
      onDirty(false);
      setState("Saved");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Save failed. Your input is preserved.",
      );
      setState("Save failed");
    } finally {
      busy.current = false;
    }
  }
  return (
    <form onSubmit={save} className="record-form">
      <fieldset disabled={state === "Saving…"}>
        <label className="field">
          {t(
            draft.kind === "vocabulary"
              ? "Word or expression"
              : draft.kind === "card"
                ? "Question / prompt"
                : draft.kind === "practice"
                  ? "What I want to try"
                  : "Title",
          )}{" "}
          *
          <input
            autoFocus
            required
            value={draft.title}
            maxLength={500}
            onChange={(e) => change({ ...draft, title: e.target.value })}
            placeholder={
              draft.kind === "book" ? "A book worth returning to…" : ""
            }
          />
        </label>
        {duplicate && (
          <p className="notice">
            A similar word already exists in this language. You can still save a
            distinct meaning.
          </p>
        )}
        <div className="form-grid">
          <label className="field">
            {t("Language")}
            <select
              aria-label={t("Language")}
              value={draft.language}
              onChange={(e) =>
                change({ ...draft, language: e.target.value as "en" | "fr" })
              }
            >
              <option value="en">{t("English")}</option>
              <option value="fr">{t("French")}</option>
            </select>
          </label>
          {["book", "article", "chapter", "practice"].includes(draft.kind) && (
            <label className="field">
              {t("Status")}
              <select
                aria-label={t("Status")}
                value={draft.data.status}
                onChange={(e) =>
                  data("status", e.target.value as Payload["status"])
                }
              >
                {(draft.kind === "practice"
                  ? ["planned", "tried", "reflected"]
                  : ["to-learn", "in-progress", "completed"]
                ).map((s) => (
                  <option key={s} value={s}>
                    {t(
                      {
                        "to-learn": "To learn",
                        "in-progress": "In progress",
                        completed: "Completed",
                        planned: "Planned",
                        tried: "Tried",
                        reflected: "Reflected",
                      }[s]!,
                    )}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft.kind === "chapter" && (
            <label className="field">
              {t("Chapter number / order")}
              <input
                type="number"
                min="0"
                value={draft.position}
                onChange={(e) =>
                  change({ ...draft, position: Number(e.target.value) })
                }
              />
            </label>
          )}
        </div>
        {["vocabulary", "card", "practice"].includes(draft.kind) && (
          <label className="field">
            {t("Source")}
            <select
              value={draft.parent_id ?? ""}
              onChange={(e) =>
                change({ ...draft, parent_id: e.target.value || null })
              }
            >
              <option value="">—</option>
              {records
                .filter(
                  (r) =>
                    !r.deleted_at &&
                    [
                      "book",
                      "article",
                      "chapter",
                      ...(draft.kind === "card" ? ["vocabulary"] : []),
                    ].includes(r.kind),
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        {draft.kind === "article" && input("Original URL", "url", "url")}
        {draft.kind === "practice" && (
          <div className="form-grid">
            {input("Where / when", "when")}
            {input("Target date", "targetDate", "date")}
          </div>
        )}
        <details className="form-details">
          <summary>
            {t("Optional details")}
            <ChevronDown size={16} />
          </summary>
          <div className="form-grid">
            {["book", "article"].includes(draft.kind) && (
              <>
                {input("Author", "author")}
                {input("Category", "category")}
                {input("Image URL", "image", "url")}
                {input("Learning goal", "goal")}
              </>
            )}
            {draft.kind === "book" && (
              <>
                {input("Subtitle", "subtitle")}
                {input("Publication year / edition", "year")}
              </>
            )}
            {draft.kind === "vocabulary" && (
              <>
                {input("Part of speech", "partOfSpeech")}
                {input("Pronunciation", "pronunciation")}
                {draft.language === "fr" && (
                  <>
                    {input("Gender", "gender")}
                    {input("Plural form", "plural")}
                  </>
                )}
                {input("Synonyms", "synonyms")}
                {input("Antonyms", "antonyms")}
                {input("Sentence completion (use ___ for the blank)", "cloze")}
                {input("Sentence answer", "clozeAnswer")}
              </>
            )}
            {input("Tags", "tags")}
          </div>
        </details>
        <div className="note-sections">
          {sections[draft.kind].map((key, index) => (
            <details
              key={key}
              open={index === 0 || undefined}
              className="note-section"
            >
              <summary>
                <span>
                  {t(fields[key])}
                  {draft.data.notes[key] && <Check size={14} />}
                </span>
                <ChevronDown size={16} />
              </summary>
              {key === "evidence" && (
                <div className="evidence-fields">
                  <p className="muted">
                    {t(
                      "These are your assessments, not automatic verification.",
                    )}
                  </p>
                  <label className="field">
                    {t("Evidence assessment")}
                    <select
                      value={draft.data.evidenceStatus}
                      onChange={(e) =>
                        data(
                          "evidenceStatus",
                          e.target.value as Payload["evidenceStatus"],
                        )
                      }
                    >
                      {[
                        "Not checked",
                        "Supported",
                        "Partly supported",
                        "Mixed evidence",
                        "Contradicted",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  {input("Date checked", "checkedDate", "date")}
                </div>
              )}
              <Editor
                t={t}
                label={t(fields[key])}
                value={draft.data.notes[key] ?? ""}
                onChange={(v) =>
                  data("notes", { ...draft.data.notes, [key as Field]: v })
                }
              />
            </details>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          <AlertCircle size={18} />
          {error}
        </p>
      )}
      <div className="save-bar">
        <span
          aria-live="polite"
          className={state === "Save failed" ? "error" : "muted"}
        >
          {state === "Saved" && <Check size={16} />}{" "}
          {t(
            state ||
              "Only a title is required. Fill the rest in your own time.",
          )}
        </span>
        <Button disabled={state === "Saving…"} type="submit">
          <Save size={16} />
          {t(state === "Saving…" ? "Saving…" : "Save")}
        </Button>
      </div>
    </form>
  );
}
