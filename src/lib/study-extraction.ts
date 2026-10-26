import { Lexer, type Token, type MarkedToken } from "marked";

function plain(tokens: Token[]): string {
  return tokens
    .map((raw) => {
      const token = raw as MarkedToken;
      if (token.type === "br") return "\n";
      if ("tokens" in token && token.tokens) return plain(token.tokens);
      return "text" in token ? token.text : token.raw;
    })
    .join("")
    .trim();
}
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Extract only explicit study structures; never infer answers from the lesson.
export function extractStudyItems(markdown: string) {
  const vocabulary: { word: string; definition: string; example: string }[] =
    [];
  const cards: { question: string; answer: string }[] = [];
  const seenWords = new Set<string>(),
    seenCards = new Set<string>();
  const addWord = (word: string, definition: string, example = "") => {
    if (!word.trim() || !definition.trim()) return;
    const value = {
      word: word.trim(),
      definition: definition.trim(),
      example: example.trim(),
    };
    const key = JSON.stringify(value);
    if (!seenWords.has(key)) {
      vocabulary.push(value);
      seenWords.add(key);
    }
  };
  const addCard = (question: string, answer: string) => {
    if (!question.trim() || !answer.trim()) return;
    const value = { question: question.trim(), answer: answer.trim() };
    const key = JSON.stringify(value);
    if (!seenCards.has(key)) {
      cards.push(value);
      seenCards.add(key);
    }
  };
  let section: "vocabulary" | "review" | null = null;
  let sectionDepth = 0;
  let question = "",
    answer = "";
  const flush = () => {
    addCard(question, answer);
    question = "";
    answer = "";
  };
  function visit(tokens: Token[], depth = 0) {
    if (depth > 40) return;
    for (const raw of tokens) {
      const token = raw as MarkedToken;
      if (token.type === "heading") {
        const title = normalize(plain(token.tokens));
        const next =
          /^(vocabulary|key vocabulary|glossary|vocabulaire|lexique)$/.test(
            title,
          )
            ? "vocabulary"
            : /^(review|review cards|recall cards|flashcards|recall questions|review questions|practice questions|revision|questions de revision)$/.test(
                  title,
                )
              ? "review"
              : null;
        if (next || token.depth <= sectionDepth) {
          flush();
          section = next;
          sectionDepth = token.depth;
        }
      } else if (token.type === "table") {
        const headers = token.header.map((cell) =>
          normalize(plain(cell.tokens)),
        );
        const index = (names: string[]) =>
          headers.findIndex((header) => names.includes(header));
        const word = index(["word", "term", "expression", "mot", "terme"]);
        const definition = index([
          "definition",
          "meaning",
          "sens",
          "signification",
        ]);
        const example = index([
          "example",
          "example sentence",
          "exemple",
          "phrase exemple",
        ]);
        const q = index(["question", "front", "recto"]),
          a = index(["answer", "back", "reponse", "verso"]);
        for (const row of token.rows) {
          const value = (i: number) =>
            i >= 0 && row[i] ? plain(row[i].tokens) : "";
          if (word >= 0 && definition >= 0)
            addWord(value(word), value(definition), value(example));
          else if (q >= 0 && a >= 0) addCard(value(q), value(a));
        }
      } else if (token.type === "list") {
        for (const item of token.items) visit(item.tokens, depth + 1);
      } else if (
        section === "review" &&
        (token.type === "paragraph" || token.type === "text")
      ) {
        const lines = (token.tokens ? plain(token.tokens) : token.text).split(
          /\r?\n/,
        );
        for (const line of lines) {
          const q = line.match(/^\s*(?:Q|Question)\s*:\s*(.+)$/i);
          const a = line.match(/^\s*(?:A|Answer|Réponse|Reponse)\s*:\s*(.+)$/i);
          if (q) {
            flush();
            question = q[1];
          } else if (a && question) answer = a[1];
          else if (answer && line.trim()) answer += `\n${line}`;
        }
      }
    }
  }
  visit(Lexer.lex(markdown, { gfm: true }));
  flush();
  return { vocabulary, cards };
}
