# Session 2 — Task 2 Completion

## Task statement

Build a small AI-assisted Next.js application backed by Supabase. Include authentication and a basic data flow such as add, read, update or delete. Keep the application focused and functional.

## Completed product

**Product name:** LiveTask Canvas  
**Current task scope:** Authenticated personal task manager  
**Future scope:** Supabase Realtime in Task 3 and HTML Canvas in Task 4

## Completed requirements

| Requirement | Implementation | Status |
|---|---|---|
| Small useful application | Personal task planning workspace | Complete |
| Next.js application | Next.js App Router with TypeScript | Complete |
| Supabase backend | Supabase Auth and PostgreSQL | Complete |
| Authentication | Sign up, email confirmation callback, sign in and sign out | Complete |
| Create | Add a task with title, description, priority, status and due date | Complete |
| Read | Protected dashboard loads only the signed-in user's tasks | Complete |
| Update | Edit details and change task status | Complete |
| Delete | Delete a task after confirmation | Complete |
| Data security | Row-Level Security policies for every CRUD operation | Complete |
| Focused scope | One task-management workflow without unrelated features | Complete |
| AI-assisted evidence | Prompt record and architecture notes included in `/docs` | Complete |

## User flow

1. A new user opens the website and creates an account.
2. Supabase sends an email confirmation if confirmation is enabled.
3. The user signs in and reaches the protected dashboard.
4. The server verifies the user through Supabase Auth.
5. The dashboard reads tasks allowed by the user's RLS policies.
6. The user creates, updates or deletes tasks.
7. Every database operation is checked against `auth.uid() = user_id`.
8. The user signs out and returns to the login page.

## Architecture

```text
Browser
  ├── Public landing page
  ├── Sign-up / sign-in forms
  └── Protected task dashboard
             │
             ├── Supabase Auth
             └── Supabase Data API
                       │
                 PostgreSQL tasks
                       │
               Row-Level Security
```

## Why Realtime is not included yet

Realtime is deliberately reserved for Session 2 Task 3. Task 2 establishes the authenticated CRUD foundation first. In Task 3, the task list will subscribe to Supabase Postgres Changes so updates appear across multiple sessions without refreshing.

## Demonstration checklist

- Open the landing page.
- Create an account or sign in.
- Show the protected dashboard.
- Create a task.
- Search and filter tasks.
- Change a task from To do to In progress and Completed.
- Edit the title, description, priority and due date.
- Delete a task.
- Sign out.
- Open Supabase Table Editor and show that the task data was stored.
- Briefly show the RLS policies from `supabase/schema.sql`.
