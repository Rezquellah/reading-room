"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Link as LinkIcon,
  Undo,
} from "lucide-react";
export function Editor({
  value,
  onChange,
  label,
  t = (s: string) => s,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  t?: (s: string) => string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, protocols: ["http", "https", "mailto"] },
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
        class: "rich-input",
      },
    },
  });
  if (!editor)
    return <div className="editor-loading">{t("Loading editor…")}</div>;
  const actions = [
    {
      label: "Bold",
      icon: Bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Heading",
      icon: Heading2,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Bullet list",
      icon: List,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quotation",
      icon: Quote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Link",
      icon: LinkIcon,
      run: () => {
        const href = window.prompt(t("Link URL (https://…)"));
        if (href && /^https?:\/\//i.test(href))
          editor.chain().focus().setLink({ href }).run();
      },
    },
    {
      label: "Undo",
      icon: Undo,
      run: () => editor.chain().focus().undo().run(),
    },
  ];
  return (
    <div className="editor">
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label={`${label} formatting`}
      >
        {actions.map((a) => (
          <button
            type="button"
            key={a.label}
            title={t(a.label)}
            aria-label={t(a.label)}
            onClick={a.run}
          >
            <a.icon size={16} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
