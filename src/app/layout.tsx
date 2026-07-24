import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveTask Canvas",
  description: "Session 2 Task 2 — an authenticated task management application built with Next.js and Supabase.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
