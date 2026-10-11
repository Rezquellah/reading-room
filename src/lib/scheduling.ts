import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";
export function schedule(
  state: Partial<Card> | undefined,
  grade: number,
  now = new Date(),
) {
  if (![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(grade))
    throw new Error("Invalid recall rating");
  const card = { ...createEmptyCard(now), ...state };
  card.due = new Date(card.due);
  if (card.last_review) card.last_review = new Date(card.last_review);
  return fsrs().next(card, now, grade as Grade);
}
