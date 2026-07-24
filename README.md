# LiveTask Canvas

A focused authenticated task-management application created for **MERN Stack Internship 2026 — Session 2, Task 2**.

## Task 2 status

- Next.js web application
- Supabase email/password authentication
- Cookie-based SSR session support
- Protected dashboard
- Complete task CRUD
- Search and status filtering
- Task priority and due dates
- Row-Level Security
- Responsive interface
- Ready for Realtime in Task 3

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth
- Supabase PostgreSQL
- `@supabase/ssr`
- Plain responsive CSS

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a project in Supabase, then open **SQL Editor** and run:

```text
supabase/schema.sql
```

This creates the `tasks` table, indexes, timestamp trigger and all RLS policies.

### 3. Add environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Add values from the Supabase project **Connect** panel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Do not place a service-role key in this file or in browser code.

### 4. Configure the Auth redirect URL

In Supabase Dashboard, open **Authentication → URL Configuration**.

For local development, set:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

After deploying, add the production callback URL as well:

```text
https://your-vercel-domain.vercel.app/auth/callback
```

### 5. Run the application

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build verification

```bash
npm run lint
npm run build
```

## Important folders

```text
src/app/                   Next.js routes and global styles
src/components/            Authentication and task-management UI
src/lib/supabase/          Browser, server and Proxy Supabase clients
src/types/                 Task TypeScript types
supabase/schema.sql        Database and RLS setup
docs/                      Assignment evidence and Loom script
```

## CRUD mapping

| Operation | Supabase call |
|---|---|
| Create | `.from("tasks").insert(...).select().single()` |
| Read | `.from("tasks").select("*")` |
| Update | `.from("tasks").update(...).eq("id", id)` |
| Delete | `.from("tasks").delete().eq("id", id)` |

## Security

The application uses a public Supabase publishable key in the client. Data remains private because the `tasks` table has RLS enabled and each policy requires:

```sql
(select auth.uid()) = user_id
```

The service-role key must never be exposed in the browser.

## Next assignment step

Session 2 Task 3 will add Supabase Realtime subscriptions to the existing `tasks` table so create, update and delete events appear in other sessions without refreshing.
