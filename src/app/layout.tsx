import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Reading Room — A home for your ideas",
  description:
    "Read deeply. Remember longer. Your personal library and learning journal.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
