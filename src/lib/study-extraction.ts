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
  const practice: { title: string; instructions: string }[] = [];
  const seenPractice = new Set<string>();
  const addPractice = (title: string, instructions: string) => {
    if (!title.trim() || !instructions.trim()) return;
    const value = {
      title: title.trim().slice(0, 500),
      instructions: instructions.trim(),
    };
    const key = JSON.stringify(value);
    if (!seenPractice.has(key)) {
      practice.push(value);
      seenPractice.add(key);
    }
  };
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
        const exercise = index([
          "exercise",
          "task",
          "challenge",
          "exercice",
          "defi",
        ]);
        const instructions = index([
          "instructions",
          "action",
          "application",
          "consigne",
          "consignes",
        ]);
        for (const row of token.rows) {
          const value = (i: number) =>
            i >= 0 && row[i] ? plain(row[i].tokens) : "";
          if (word >= 0 && definition >= 0)
            addWord(value(word), value(definition), value(example));
          else if (q >= 0 && a >= 0) addCard(value(q), value(a));
          else if (exercise >= 0 && instructions >= 0)
            addPractice(value(exercise), value(instructions));
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
  const tokens = Lexer.lex(markdown, { gfm: true });
  visit(tokens);
  flush();
  // Older exports often contain a complete scenario under a Practice/Challenge heading.
  // Preserve it as an unanswered exercise, never as a completed action or an answer key.
  for (let i = 0; i < tokens.length; i++) {
    const heading = tokens[i] as MarkedToken;
    if (heading.type !== "heading") continue;
    const title = plain(heading.tokens);
    const name = normalize(title);
    if (
      !/\b(practice|challenge|exercise|exercises|pratique|exercice|exercices|defi)\b/.test(
        name,
      ) ||
      /\b(questions|cards|review)\b/.test(name)
    )
      continue;
    let end = i + 1;
    while (end < tokens.length) {
      const next = tokens[end] as MarkedToken;
      if (next.type === "heading" && next.depth <= heading.depth) break;
      end++;
    }
    const sectionTokens = tokens.slice(i + 1, end);
    // Tables are already split into individual exercises by visit().
    const hasPracticeTable = sectionTokens.some((raw) => {
      const t = raw as MarkedToken;
      if (t.type !== "table") return false;
      const headers = t.header.map((cell) => normalize(plain(cell.tokens)));
      return (
        headers.some((h) =>
          ["exercise", "task", "challenge", "exercice", "defi"].includes(h),
        ) &&
        headers.some((h) =>
          [
            "instructions",
            "action",
            "application",
            "consigne",
            "consignes",
          ].includes(h),
        )
      );
    });
    if (!hasPracticeTable) {
      const readable = (items: Token[]): string =>
        items
          .map((raw) => {
            const t = raw as MarkedToken;
            if (t.type === "list")
              return t.items
                .map((item) => `• ${readable(item.tokens)}`)
                .join("\n");
            if (t.type === "space") return "";
            if (t.type === "code") return t.text;
            if (t.type === "blockquote") return readable(t.tokens);
            return "tokens" in t && t.tokens
              ? plain(t.tokens)
              : "text" in t
                ? t.text
                : t.raw;
          })
          .filter(Boolean)
          .join("\n\n");
      addPractice(title, readable(sectionTokens));
    }
    i = end - 1;
  }
  const vocabularyReview = !cards.length && vocabulary.length > 0;
  if (vocabularyReview)
    for (const word of vocabulary) addCard(word.word, word.definition);
  return { vocabulary, cards, practice, vocabularyReview };
}
