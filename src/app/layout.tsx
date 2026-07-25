import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveTask — Focused task management",
  description: "A minimal real-time task and visual planning workspace built with Next.js and Supabase.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
