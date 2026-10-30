"use client";
import {
  useEditor,
  useEditorState,
  EditorContent,
  type JSONContent,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Table,
  ImagePlus,
  Link,
  Undo,
  Redo,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Maximize,
  Minimize,
  RemoveFormatting,
  Search,
  BookmarkPlus,
  X,
  ChevronDown,
  ChevronUp,
  Unlink,
} from "lucide-react";
const bubbleOptions = { placement: "top" as const, offset: 10 };
const template = [
  "Main Idea",
  "Detailed Explanation",
  "Author’s Argument",
  "Key Lessons",
  "Examples",
  "Evidence and Limitations",
  "Important Quotes",
  "My Interpretation",
  "Real-Life Applications",
  "Recall Questions",
  "Revision Summary",
  "Sources",
];
export default function Editor({
  id,
  content,
  onSave,
  onCard,
  readonly = false,
}: {
  id: string;
  content: JSONContent;
  onSave: (json: JSONContent) => Promise<void>;
  onCard: (selection: string) => void;
  readonly?: boolean;
}) {
  const [status, setStatus] = useState("Saved"),
    [focus, setFocus] = useState(false);
  const [panel, setPanel] = useState<"link" | "find" | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchIndex, setMatchIndex] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    pending = useRef<JSONContent | null>(null),
    saving = useRef(false),
    saveFn = useRef(onSave),
    file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    saveFn.current = onSave;
  }, [onSave]);
  async function flush() {
    if (saving.current || !pending.current) return;
    saving.current = true;
    const value = pending.current;
    pending.current = null;
    setStatus("Saving…");
    let failed = false;
    try {
      await saveFn.current(value);
      if (!pending.current) localStorage.removeItem(`reading-draft:${id}`);
      setStatus("Saved");
    } catch {
      failed = true;
      pending.current = pending.current ?? value;
      setStatus("Not synced · draft kept on this device");
    } finally {
      saving.current = false;
    }
    if (pending.current && !failed) void flush();
  }
  async function upload(image: File) {
    setStatus("Uploading image…");
    try {
      const data = new FormData();
      data.set("file", image);
      const r = await fetch("/api/assets", { method: "POST", body: data });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      editor?.chain().focus().setImage({ src: v.url, alt: image.name }).run();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Image upload failed");
    }
  }
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readonly,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        resize: {
          enabled: true,
          directions: ["bottom-left", "bottom-right"],
          alwaysPreserveAspectRatio: true,
        },
      }),
      TableKit.configure({ table: { resizable: true } }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
      TextStyleKit,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    editorProps: {
      scrollMargin: { top: 220, bottom: 40, left: 10, right: 10 },
      attributes: {
        "aria-label": "Note document",
        class: "document",
        role: "textbox",
        "aria-multiline": "true",
        spellcheck: "true",
      },
      handlePaste: (_, event) => {
        const img = Array.from(event.clipboardData?.files ?? []).find((f) =>
          f.type.startsWith("image/"),
        );
        if (img) {
          void upload(img);
          return true;
        }
        return false;
      },
      handleDrop: (_, event) => {
        const img = event.dataTransfer?.files[0];
        if (img?.type.startsWith("image/")) {
          event.preventDefault();
          void upload(img);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      pending.current = json;
      try {
        localStorage.setItem(`reading-draft:${id}`, JSON.stringify(json));
      } catch {
        setStatus("Device backup unavailable");
      }
      setStatus("Unsaved changes");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 900);
    },
  });
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (pending.current || saving.current) e.preventDefault();
    };
    const retry = () => void flush();
    window.addEventListener("beforeunload", prevent);
    window.addEventListener("online", retry);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
      window.removeEventListener("beforeunload", prevent);
      window.removeEventListener("online", retry);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  });
  const e = editor;
  const formatting = e
    ? {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        highlight: e.isActive("highlight"),
        code: e.isActive("code"),
        heading:
          [1, 2, 3].find((level) => e.isActive("heading", { level })) ?? 0,
        size: e.getAttributes("textStyle").fontSize ?? "18px",
        color: e.getAttributes("textStyle").color ?? "#355c4a",
        table: e.isActive("table"),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        tasks: e.isActive("taskList"),
        quote: e.isActive("blockquote"),
        codeBlock: e.isActive("codeBlock"),
        alignment:
          e.getAttributes("paragraph").textAlign ??
          e.getAttributes("heading").textAlign ??
          "left",
        undo: e.can().undo(),
        redo: e.can().redo(),
        link: e.isActive("link"),
        words: e.getText().split(/\s+/).filter(Boolean).length,
      }
    : null;
  useEffect(() => {
    if (!focus) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [focus]);
  if (!editor || !formatting)
    return <div className="skeleton">Opening your document…</div>;
  function matches() {
    const found: { from: number; to: number }[] = [];
    if (!query.trim() || !editor) return found;
    editor.state.doc.descendants((node, position) => {
      if (!node.isTextblock) return;
      const text = node
        .textBetween(0, node.content.size, "", "\ufffc")
        .toLowerCase();
      const needle = query.toLowerCase();
      let offset = text.indexOf(needle);
      while (offset !== -1) {
        found.push({
          from: position + 1 + offset,
          to: position + 1 + offset + query.length,
        });
        offset = text.indexOf(needle, offset + needle.length);
      }
      return false;
    });
    return found;
  }
  const results = matches();
  function findNext(direction = 1) {
    if (!results.length || !editor) return;
    const index =
      matchIndex < 0
        ? direction > 0
          ? 0
          : results.length - 1
        : (matchIndex + direction + results.length) % results.length;
    setMatchIndex(index);
    editor.chain().setTextSelection(results[index]).scrollIntoView().run();
  }
  function openLink() {
    setLinkUrl(editor?.getAttributes("link").href ?? "");
    setLinkError("");
    setPanel("link");
  }
  function applyLink(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const value = linkUrl.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setPanel(null);
      return;
    }
    try {
      const url = new URL(value);
      if (!["http:", "https:", "mailto:"].includes(url.protocol))
        throw new Error();
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: value })
        .run();
      setPanel(null);
    } catch {
      setLinkError("Use a complete https://, http://, or mailto: link.");
    }
  }

  const button = (
    label: string,
    Icon: typeof Bold,
    action: () => void,
    active = false,
    disabled = false,
  ) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={active ? "selected" : ""}
      disabled={readonly || disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      <Icon size={16} />
    </button>
  );
  return (
    <section
      className={`editor ${focus ? "focused" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setPanel(null);
          setFocus(false);
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          void flush();
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "f"
        ) {
          event.preventDefault();
          setPanel("find");
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "k" &&
          !readonly
        ) {
          event.preventDefault();
          event.stopPropagation();
          openLink();
        }
      }}
    >
      <div className="editor-controls">
        <div className="editor-meta">
          <span className="eyebrow">YOUR THINKING SPACE</span>
          <span role="status">{status}</span>
          <button onClick={() => void flush()}>Save now</button>
          <button
            onClick={() => {
              try {
                const draft = localStorage.getItem(`reading-draft:${id}`);
                if (draft) {
                  editor.commands.setContent(JSON.parse(draft), {
                    emitUpdate: true,
                    errorOnInvalidContent: true,
                  });
                  setStatus("Recovered device draft");
                } else setStatus("No unsynced draft on this device");
              } catch {
                setStatus(
                  "This device draft could not be opened. Your saved note is unchanged.",
                );
              }
            }}
          >
            Recover draft
          </button>
          <button
            aria-label="Distraction-free mode"
            aria-pressed={focus}
            onClick={() => setFocus(!focus)}
          >
            {focus ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>
        </div>
        <div
          className="toolbar"
          role="group"
          aria-label="Formatting tools"
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).closest("button"))
              event.preventDefault();
          }}
        >
          <select
            aria-label="Text style"
            disabled={readonly}
            value={formatting.heading}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v)
                editor
                  .chain()
                  .focus()
                  .setHeading({ level: v as 1 | 2 | 3 })
                  .run();
              else editor.chain().focus().setParagraph().run();
            }}
          >
            <option value="0">Paragraph</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>
          {button(
            "Bold",
            Bold,
            () => {
              editor.chain().focus().toggleBold().run();
            },
            formatting.bold,
          )}
          {button(
            "Italic",
            Italic,
            () => {
              editor.chain().focus().toggleItalic().run();
            },
            formatting.italic,
          )}
          {button(
            "Underline",
            Underline,
            () => {
              editor.chain().focus().toggleUnderline().run();
            },
            formatting.underline,
          )}
          {button(
            "Strikethrough",
            Strikethrough,
            () => {
              editor.chain().focus().toggleStrike().run();
            },
            formatting.strike,
          )}
          {button(
            "Highlight",
            Highlighter,
            () => {
              editor
                .chain()
                .focus()
                .toggleHighlight({ color: "#e7d99c" })
                .run();
            },
            formatting.highlight,
          )}
          <input
            type="color"
            aria-label="Text color"
            disabled={readonly}
            value={formatting.color}
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
          />
          <select
            aria-label="Font size"
            disabled={readonly}
            value={formatting.size}
            onChange={(e) =>
              editor.chain().focus().setFontSize(e.target.value).run()
            }
          >
            {["14px", "16px", "18px", "22px", "28px", "36px"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {button(
            "Bullet list",
            List,
            () => {
              editor.chain().focus().toggleBulletList().run();
            },
            formatting.bullet,
          )}
          {button(
            "Numbered list",
            ListOrdered,
            () => {
              editor.chain().focus().toggleOrderedList().run();
            },
            formatting.ordered,
          )}
          {button(
            "Checklist",
            ListChecks,
            () => {
              editor.chain().focus().toggleTaskList().run();
            },
            formatting.tasks,
          )}
          {button(
            "Quote or callout",
            Quote,
            () => {
              editor.chain().focus().toggleBlockquote().run();
            },
            formatting.quote,
          )}
          {button(
            "Code block",
            Code,
            () => {
              editor.chain().focus().toggleCodeBlock().run();
            },
            formatting.codeBlock,
          )}
          {button("Divider", Minus, () => {
            editor.chain().focus().setHorizontalRule().run();
          })}
          {button(
            "Align left",
            AlignLeft,
            () => {
              editor.chain().focus().setTextAlign("left").run();
            },
            formatting.alignment === "left",
          )}
          {button(
            "Align center",
            AlignCenter,
            () => {
              editor.chain().focus().setTextAlign("center").run();
            },
            formatting.alignment === "center",
          )}
          {button(
            "Align right",
            AlignRight,
            () => {
              editor.chain().focus().setTextAlign("right").run();
            },
            formatting.alignment === "right",
          )}
          {button("Insert table", Table, () => {
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run();
          })}
          {button("Insert image", ImagePlus, () => file.current?.click())}
          {button("Add link", Link, openLink, formatting.link)}
          {button(
            "Undo",
            Undo,
            () => {
              editor.chain().focus().undo().run();
            },
            false,
            !formatting.undo,
          )}
          {button(
            "Redo",
            Redo,
            () => {
              editor.chain().focus().redo().run();
            },
            false,
            !formatting.redo,
          )}
          {button("Clear formatting", RemoveFormatting, () => {
            editor.chain().focus().unsetAllMarks().clearNodes().run();
          })}
          {button(
            "Find in document",
            Search,
            () => setPanel(panel === "find" ? null : "find"),
            panel === "find",
          )}
          {button("Make recall card from selection", BookmarkPlus, () =>
            onCard(
              editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to,
                " ",
              ),
            ),
          )}
        </div>
        {formatting.table && !readonly && (
          <div
            className="toolbar"
            role="group"
            aria-label="Table tools"
            onMouseDown={(event) => {
              if ((event.target as HTMLElement).closest("button"))
                event.preventDefault();
            }}
          >
            <button onClick={() => editor.chain().focus().addRowAfter().run()}>
              + Row
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              + Column
            </button>
            <button onClick={() => editor.chain().focus().deleteRow().run()}>
              Delete row
            </button>
            <button onClick={() => editor.chain().focus().deleteColumn().run()}>
              Delete column
            </button>
            <button onClick={() => editor.chain().focus().deleteTable().run()}>
              Remove table
            </button>
          </div>
        )}
        {panel === "link" && (
          <form
            className="editor-panel"
            onSubmit={applyLink}
            aria-label="Edit link"
          >
            <label>
              Link URL
              <input
                autoFocus
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </label>
            <button className="primary" type="submit">
              Apply link
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
                setPanel(null);
              }}
            >
              <Unlink size={15} /> Remove link
            </button>
            <button
              type="button"
              aria-label="Close link editor"
              onClick={() => setPanel(null)}
            >
              <X size={18} />
            </button>
            {linkError && <p role="alert">{linkError}</p>}
          </form>
        )}
        {panel === "find" && (
          <div
            className="editor-panel"
            role="search"
            aria-label="Find and replace"
          >
            <label>
              Find
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setMatchIndex(-1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    findNext(event.shiftKey ? -1 : 1);
                  }
                }}
              />
            </label>
            <span role="status">
              {results.length
                ? `${matchIndex < 0 ? 0 : Math.min(matchIndex + 1, results.length)} of ${results.length}`
                : query
                  ? "No matches"
                  : "Enter text"}
            </span>
            <button
              aria-label="Previous match"
              disabled={!results.length}
              onClick={() => findNext(-1)}
            >
              <ChevronUp size={17} />
            </button>
            <button
              aria-label="Next match"
              disabled={!results.length}
              onClick={() => findNext()}
            >
              <ChevronDown size={17} />
            </button>
            {!readonly && (
              <>
                <label>
                  Replace with
                  <input
                    value={replacement}
                    onChange={(event) => setReplacement(event.target.value)}
                  />
                </label>
                <button
                  disabled={!results.length}
                  onClick={() => {
                    const match =
                      results[
                        Math.max(0, Math.min(matchIndex, results.length - 1))
                      ];
                    if (match)
                      editor
                        .chain()
                        .setTextSelection(match)
                        .insertContent(
                          replacement
                            ? { type: "text", text: replacement }
                            : "",
                        )
                        .run();
                    setMatchIndex(-1);
                  }}
                >
                  Replace
                </button>
                <button
                  disabled={!results.length}
                  onClick={() => {
                    const transaction = editor.state.tr;
                    for (const match of [...results].reverse())
                      transaction.insertText(replacement, match.from, match.to);
                    editor.view.dispatch(transaction);
                    setMatchIndex(-1);
                  }}
                >
                  Replace all
                </button>
              </>
            )}
            <button
              aria-label="Close find and replace"
              onClick={() => setPanel(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
      <input
        hidden
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          const img = e.target.files?.[0];
          if (img) void upload(img);
          e.target.value = "";
        }}
      />
      {!readonly && (
        <BubbleMenu editor={editor} options={bubbleOptions}>
          <div
            className="selection-toolbar"
            role="group"
            aria-label="Selection formatting"
          >
            {button(
              "Bold selection",
              Bold,
              () => editor.chain().focus().toggleBold().run(),
              formatting.bold,
            )}
            {button(
              "Italic selection",
              Italic,
              () => editor.chain().focus().toggleItalic().run(),
              formatting.italic,
            )}
            {button(
              "Underline selection",
              Underline,
              () => editor.chain().focus().toggleUnderline().run(),
              formatting.underline,
            )}
            {button(
              "Highlight selection",
              Highlighter,
              () => editor.chain().focus().toggleHighlight().run(),
              formatting.highlight,
            )}
            {button("Link selection", Link, openLink, formatting.link)}
            {button("Make recall card", BookmarkPlus, () =>
              onCard(
                editor.state.doc.textBetween(
                  editor.state.selection.from,
                  editor.state.selection.to,
                  " ",
                ),
              ),
            )}
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
      <footer className="editor-footer">
        <span>{formatting.words} words · Your ideas, in your own words.</span>
        <button
          disabled={readonly}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent(
                template.flatMap((title) => [
                  {
                    type: "heading",
                    attrs: { level: 2 },
                    content: [{ type: "text", text: title }],
                  },
                  { type: "paragraph" },
                ]),
              )
              .run()
          }
        >
          Insert learning template
        </button>
      </footer>
    </section>
  );
}
