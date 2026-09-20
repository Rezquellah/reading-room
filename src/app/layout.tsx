import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Reading Room — A little wiser, every day",
  description:
    "Your personal place to read, remember, and put ideas into practice.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
