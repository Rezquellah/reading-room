"use client";
import { useEffect } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";

export default function MarkdownPreview({ content }: { content: JSONContent }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image,
      TableKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "document",
        "aria-label": "Markdown lesson preview",
      },
    },
  });
  useEffect(() => {
    editor?.commands.setContent(content);
  }, [editor, content]);
  return (
    <div className="markdown-preview">
      <EditorContent editor={editor} />
    </div>
  );
}
