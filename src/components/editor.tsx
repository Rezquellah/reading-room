"use client";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
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
} from "lucide-react";
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
      StarterKit,
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
      attributes: { "aria-label": "Note document", class: "document" },
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
  if (!editor) return <div className="skeleton">Opening your document…</div>;
  const button = (
    label: string,
    Icon: typeof Bold,
    action: () => void,
    active = false,
  ) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={active ? "selected" : ""}
      onClick={action}
    >
      <Icon size={16} />
    </button>
  );
  return (
    <section className={`editor ${focus ? "focused" : ""}`}>
      <div className="editor-meta">
        <span className="eyebrow">YOUR THINKING SPACE</span>
        <span role="status">{status}</span>
        <button onClick={() => void flush()}>Save now</button>
        <button
          onClick={() => {
            const draft = localStorage.getItem(`reading-draft:${id}`);
            if (draft) {
              editor.commands.setContent(JSON.parse(draft), {
                emitUpdate: true,
              });
              setStatus("Recovered device draft");
            } else setStatus("No unsynced draft on this device");
          }}
        >
          Recover draft
        </button>
        <button
          aria-label="Distraction-free mode"
          onClick={() => setFocus(!focus)}
        >
          {focus ? <Minimize size={17} /> : <Maximize size={17} />}
        </button>
      </div>
      <div className="toolbar">
        <select
          aria-label="Text style"
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v)
              editor
                .chain()
                .focus()
                .toggleHeading({ level: v as 1 | 2 | 3 })
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
          editor.isActive("bold"),
        )}
        {button("Italic", Italic, () => {
          editor.chain().focus().toggleItalic().run();
        })}
        {button("Underline", Underline, () => {
          editor.chain().focus().toggleUnderline().run();
        })}
        {button("Strikethrough", Strikethrough, () => {
          editor.chain().focus().toggleStrike().run();
        })}
        {button("Highlight", Highlighter, () => {
          editor.chain().focus().toggleHighlight({ color: "#e7d99c" }).run();
        })}
        <input
          type="color"
          aria-label="Text color"
          defaultValue="#355c4a"
          onChange={(e) =>
            editor.chain().focus().setColor(e.target.value).run()
          }
        />
        <select
          aria-label="Font size"
          defaultValue="18px"
          onChange={(e) =>
            editor.chain().focus().setFontSize(e.target.value).run()
          }
        >
          {["14px", "16px", "18px", "22px", "28px", "36px"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {button("Bullet list", List, () => {
          editor.chain().focus().toggleBulletList().run();
        })}
        {button("Numbered list", ListOrdered, () => {
          editor.chain().focus().toggleOrderedList().run();
        })}
        {button("Checklist", ListChecks, () => {
          editor.chain().focus().toggleTaskList().run();
        })}
        {button("Quote or callout", Quote, () => {
          editor.chain().focus().toggleBlockquote().run();
        })}
        {button("Code block", Code, () => {
          editor.chain().focus().toggleCodeBlock().run();
        })}
        {button("Divider", Minus, () => {
          editor.chain().focus().setHorizontalRule().run();
        })}
        {button("Align left", AlignLeft, () => {
          editor.chain().focus().setTextAlign("left").run();
        })}
        {button("Align center", AlignCenter, () => {
          editor.chain().focus().setTextAlign("center").run();
        })}
        {button("Align right", AlignRight, () => {
          editor.chain().focus().setTextAlign("right").run();
        })}
        {button("Insert table", Table, () => {
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        })}
        {button("Insert image", ImagePlus, () => file.current?.click())}
        {button("Add link", Link, () => {
          const url = prompt("Link URL (https://…)");
          if (url && /^https?:\/\//i.test(url))
            editor.chain().focus().setLink({ href: url }).run();
        })}
        {button("Undo", Undo, () => {
          editor.chain().focus().undo().run();
        })}
        {button("Redo", Redo, () => {
          editor.chain().focus().redo().run();
        })}
        {button("Clear formatting", RemoveFormatting, () => {
          editor.chain().focus().unsetAllMarks().clearNodes().run();
        })}
        {button("Find in document", Search, () => {
          const q = prompt("Find text");
          if (!q) return;
          let found = false;
          editor.state.doc.descendants((n, p) => {
            if (!found && n.isText) {
              const i = n.text?.toLowerCase().indexOf(q.toLowerCase()) ?? -1;
              if (i >= 0) {
                editor.commands.setTextSelection({
                  from: p + i,
                  to: p + i + q.length,
                });
                editor.commands.focus();
                found = true;
              }
            }
          });
          if (!found) setStatus("Text not found");
        })}
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
      {editor.isActive("table") && (
        <div className="toolbar">
          <button onClick={() => editor.chain().focus().addRowAfter().run()}>
            + Row
          </button>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()}>
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
      <EditorContent editor={editor} />
      <footer className="editor-footer">
        <span>
          {editor.getText().split(/\s+/).filter(Boolean).length} words · Your
          ideas, in your own words.
        </span>
        <button
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
