"use client";
import { useState } from "react";
import { type Entry, type Workspace, text } from "@/lib/model";
export default function EntryForm({
  kind,
  entry,
  workspaces,
  workspace,
  parent,
  initial,
  onSave,
}: {
  kind: Entry["kind"];
  entry?: Entry;
  workspaces: Workspace[];
  workspace: string;
  parent?: string;
  initial?: string;
  onSave: (
    value: Omit<Entry, "id" | "created_at" | "updated_at"> | Entry,
  ) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [cover, setCover] = useState(entry ? text(entry, "cover") : "");
  const field = (
    name: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label key={name}>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        defaultValue={entry ? text(entry, name) : ""}
      />
    </label>
  );
  const area = (name: string, label: string) => (
    <label className="span-two" key={name}>
      {label}
      <textarea
        name={name}
        rows={3}
        defaultValue={
          entry ? text(entry, name) : name === "answer" ? initial : ""
        }
      />
    </label>
  );
  return (
    <form
      className="entry-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const f = new FormData(e.currentTarget);
          const values = Object.fromEntries(f.entries());
          const data: Record<string, unknown> = { ...entry?.data };
          for (const [k, v] of Object.entries(values))
            if (!["title", "workspace_id"].includes(k)) data[k] = v;
          data.cover = cover;
          await onSave({
            ...entry,
            kind,
            title: String(values.title),
            workspace_id: String(values.workspace_id),
            parent_id: entry?.parent_id ?? parent ?? null,
            data,
          } as Entry);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="span-two">
        {kind === "vocabulary"
          ? "Word or expression"
          : kind === "card"
            ? "Recall question"
            : "Title"}
        <input
          name="title"
          required
          maxLength={500}
          autoFocus
          defaultValue={entry?.title ?? ""}
          placeholder={
            kind === "book"
              ? "What will you read next?"
              : kind === "card"
                ? "What do you want to remember?"
                : ""
          }
        />
      </label>
      <label>
        Workspace
        <select
          name="workspace_id"
          defaultValue={entry?.workspace_id ?? workspace}
          disabled={Boolean(entry || parent)}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.icon} {w.name}
            </option>
          ))}
        </select>
        {(entry || parent) && (
          <input
            type="hidden"
            name="workspace_id"
            value={entry?.workspace_id ?? workspace}
          />
        )}
      </label>
      {["book", "article", "chapter", "action"].includes(kind) && (
        <label>
          Status
          <select
            name="status"
            defaultValue={entry ? text(entry, "status") : "Want to Read"}
          >
            {(kind === "action"
              ? ["Planned", "In progress", "Applied"]
              : ["Want to Read", "Reading", "Completed", "Paused", "Abandoned"]
            ).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      )}
      {["book", "article"].includes(kind) && (
        <>
          {field("author", "Author")}
          {field("category", "Category / genre")}
          {field("tags", "Tags (comma-separated)")}
          {field("rating", "Personal rating (0–5)", "number")}
          <label className="span-two">
            Cover image URL
            <input
              type="url"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
            />
          </label>
          <label className="span-two">
            Or upload a cover (up to 5 MB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                try {
                  const form = new FormData();
                  form.set("file", f);
                  const r = await fetch("/api/assets", {
                    method: "POST",
                    body: form,
                  });
                  const v = await r.json();
                  if (!r.ok) throw new Error(v.error);
                  setCover(v.url);
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {area("description", "About this reading")}
          {field("start_date", "Started reading", "date")}
          {field("target_date", "Target finish", "date")}
          {field("completion_date", "Finished reading", "date")}
          {area("goal", "My reading intention")}
        </>
      )}
      {kind === "book" && (
        <>
          {field("isbn", "ISBN")}
          {field("total_chapters", "Total chapters", "number")}
          {field("current_chapter", "Current chapter", "number")}
          {field("total_pages", "Total pages", "number")}
          {field("current_page", "Current page", "number")}
        </>
      )}
      {kind === "article" && (
        <>
          {field("url", "Original URL", "url")}
          {field("publication", "Publication / source")}
          {field("publication_date", "Publication date", "date")}
          {field("read_date", "Date read", "date")}
          {field("reading_time", "Reading time (minutes)", "number")}
        </>
      )}
      {kind === "chapter" && (
        <>
          {field("order", "Chapter number", "number")}
          {field("completion_date", "Completion date", "date")}
        </>
      )}
      {kind === "vocabulary" && (
        <>
          {area("definition", "Definition")}
          {area("explanation", "In my own words")}
          {area("example", "Example sentence")}
          {field("translation", "Translation")}
          {field("synonyms", "Synonyms")}
          {field("antonyms", "Antonyms")}
          {field("tags", "Tags")}
          {area("reflection", "Personal notes")}
        </>
      )}
      {kind === "card" && (
        <>
          {area("answer", "Answer")}
          {field("tags", "Tags")}
        </>
      )}
      {kind === "quote" && (
        <>
          {area("quotation", "Quotation")}
          {field("attribution", "Attribution")}
          {field("page", "Page / reference")}
        </>
      )}
      {kind === "action" && (
        <>
          {area("lesson", "Lesson or concept")}
          {area("application", "Intended application")}
          {area("action", "My practical action")}
          {field("target_date", "Target date", "date")}
          {area("reflection", "Reflection / outcome")}
        </>
      )}
      {["note", "journal"].includes(kind) && field("tags", "Tags")}
      <p className="error span-two" role="alert">
        {error}
      </p>
      <button disabled={busy} className="primary span-two">
        {busy ? "Saving…" : entry ? "Save changes" : `Add ${kind}`}
      </button>
    </form>
  );
}
