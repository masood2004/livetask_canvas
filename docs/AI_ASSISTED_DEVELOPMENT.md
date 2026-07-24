# AI-Assisted Development Record

This document records the development prompts used to plan and generate the Session 2 Task 2 application. It can be shown as supporting evidence during the Loom walkthrough.

## Prompt 1 — Product selection

> Review the Session 2 assignment and propose one small useful product that can later be extended into a real-time web application, HTML Canvas tool, Chrome extension, Expo Android app and Tauri desktop app. Keep the first version focused on authentication and CRUD.

**Result:** LiveTask Canvas was selected: an authenticated task manager that can later gain real-time task synchronisation and a shared Canvas workspace.

## Prompt 2 — Architecture

> Design a Next.js App Router architecture using Supabase Auth with cookie-based SSR sessions and a PostgreSQL tasks table. Protect user data with Row-Level Security and keep Realtime outside Task 2.

**Result:** Separate browser/server Supabase clients, Next.js Proxy session refresh, server-protected dashboard and RLS-secured CRUD.

## Prompt 3 — Database security

> Generate an idempotent Supabase SQL schema for a tasks table. Include user ownership, title, description, status, priority, due date, timestamps, indexes, updated_at trigger and RLS policies for select, insert, update and delete.

**Result:** `supabase/schema.sql`.

## Prompt 4 — UI and CRUD

> Build a clean responsive task dashboard with summary cards, search, status filters, quick add, full editing, status updates, deletion confirmation, loading states and safe error messages. Use TypeScript and avoid unnecessary libraries.

**Result:** `src/components/task-board.tsx` and `src/app/globals.css`.

## Prompt 5 — Review

> Check the project against Session 2 Task 2 only. Confirm that authentication and CRUD are complete, RLS protects every operation, and real-time subscriptions are not accidentally implemented before Task 3.

**Result:** Completion mapping in `docs/SESSION_2_TASK_2_COMPLETION.md`.

## Notes for the intern

During the Loom video, explain the code in your own words. AI was used as a development assistant, but the important learning points are:

- Why browser and server Supabase clients are separate.
- Why the dashboard verifies the current user on the server.
- Why the public publishable key is safe only when RLS is correct.
- How create, read, update and delete operations map to Supabase calls.
- Why Task 3 will add a subscription without replacing the database CRUD flow.
