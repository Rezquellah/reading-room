import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Reading Room — A home for your ideas",
  description:
    "Read deeply. Remember longer. Turn your reading into notes, vocabulary, review cards, and real-world practice.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
