import type { Entry, Workspace } from "./model";
export const demoWorkspaces: Workspace[] = [
  {
    id: "demo-en",
    name: "English library",
    language: "en",
    color: "#355c4a",
    icon: "EN",
  },
  {
    id: "demo-fr",
    name: "Bibliothèque française",
    language: "fr",
    color: "#ab634b",
    icon: "FR",
  },
];
const date = "2026-10-01T12:00:00.000Z";
function entry(
  id: string,
  kind: Entry["kind"],
  title: string,
  data: Entry["data"],
  parent_id: string | null = null,
): Entry {
  return {
    id,
    kind,
    title,
    data,
    parent_id,
    workspace_id: "demo-en",
    created_at: date,
    updated_at: date,
  };
}
export const demoEntries: Entry[] = [
  entry("demo-1", "book", "The Creative Act", {
    author: "Rick Rubin",
    category: "Creativity",
    status: "Reading",
    current_chapter: 12,
    total_chapters: 78,
    coverStyle: "cream",
    description:
      "A way of being. Make room for attention, curiosity, and the creative life.",
  }),
  entry("demo-2", "book", "The Psychology of Money", {
    author: "Morgan Housel",
    category: "Psychology",
    status: "Reading",
    current_chapter: 7,
    total_chapters: 20,
    coverStyle: "green",
  }),
  entry("demo-3", "book", "Deep Work", {
    author: "Cal Newport",
    category: "Personal growth",
    status: "Reading",
    current_chapter: 3,
    total_chapters: 7,
    coverStyle: "rust",
  }),
  entry("demo-4", "article", "The quiet power of paying attention", {
    author: "Sample reading",
    publication: "Reading Room · sample article",
    status: "Want to Read",
    reading_time: 8,
    category: "Mindful living",
  }),
  entry(
    "demo-5",
    "note",
    "Attention is a practice",
    {
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Notice what you notice." }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Creativity begins with paying attention. A small practice: take a walk without headphones and write down three things you would normally miss.",
              },
            ],
          },
        ],
      },
      plain_text: "Creativity begins with paying attention.",
    },
    "demo-1",
  ),
  entry("demo-6", "vocabulary", "serendipity", {
    definition: "The occurrence of a happy or useful discovery by chance.",
    example: "A chance conversation led to a moment of serendipity.",
  }),
  entry(
    "demo-7",
    "card",
    "What makes deep work valuable?",
    {
      answer:
        "Focused, distraction-free effort helps us learn difficult things and produce work of lasting value.",
    },
    "demo-3",
  ),
];
