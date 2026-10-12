"use client";
import type { Entry } from "@/lib/model";
export default function Insights({
  entries,
  reviews,
  locale,
}: {
  entries: Entry[];
  reviews: { card_id: string; reviewed_at: string }[];
  locale: string;
}) {
  const owned = new Set(entries.map((e) => e.id));
  const history = reviews.filter((r) => owned.has(r.card_id));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - (7 - i) * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return {
      label: new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(start),
      count: history.filter(
        (r) =>
          new Date(r.reviewed_at) >= start && new Date(r.reviewed_at) <= end,
      ).length,
    };
  });
  const max = Math.max(1, ...weeks.map((w) => w.count));
  return (
    <section className="panel insights">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SMALL MOMENTS, LASTING GROWTH</span>
          <h2>Your learning rhythm</h2>
        </div>
        <span className="muted">Last 8 weeks</span>
      </div>
      <div className="insights-layout">
        <div
          className="activity-chart"
          role="img"
          aria-label={weeks
            .map((w) => `${w.label}: ${w.count} reviews`)
            .join("; ")}
        >
          {weeks.map((w) => (
            <div key={w.label}>
              <span>{w.count}</span>
              <i style={{ height: `${Math.max(3, (w.count / max) * 95)}px` }} />
              <small>{w.label}</small>
            </div>
          ))}
        </div>
        <div className="insight-totals">
          {[
            [
              "Books finished",
              entries.filter(
                (e) => e.kind === "book" && e.data.status === "Completed",
              ).length,
            ],
            [
              "Articles read",
              entries.filter(
                (e) => e.kind === "article" && e.data.status === "Completed",
              ).length,
            ],
            [
              "Chapters completed",
              entries.filter(
                (e) => e.kind === "chapter" && e.data.status === "Completed",
              ).length,
            ],
            ["Recall sessions graded", history.length],
          ].map(([label, n]) => (
            <div className="mini-stat" key={label}>
              <span>{label}</span>
              <strong>{n}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
