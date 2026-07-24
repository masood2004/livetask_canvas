# LiveTask

LiveTask is a minimal, private task workspace built with Next.js and Supabase. It supports complete task management and keeps open sessions synchronized through Supabase Realtime.

## Features

- Email/password authentication
- Protected personal workspace
- Create, read, update and delete tasks
- Status, priority and due dates
- Search and status filters
- Real-time task synchronization across browser sessions
- Live connection indicator
- Row-Level Security for account isolation
- Responsive minimal interface

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Supabase Authentication
- Supabase PostgreSQL
- Supabase Realtime
- `@supabase/ssr`
- Plain responsive CSS

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a Supabase project and run the full contents of:

```text
supabase/schema.sql
```

The script creates the `tasks` table, indexes, timestamp trigger, Row-Level Security policies and adds the table to the `supabase_realtime` publication.

### 3. Add environment variables

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Never expose a service-role key in browser code.

### 4. Configure authentication URLs

In **Supabase → Authentication → URL Configuration**:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

Add the production callback URL after deployment.

### 5. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Test real-time synchronization

1. Sign in to the same account in two browser windows.
2. Keep the dashboard open in both windows.
3. Create, edit, complete or delete a task in one window.
4. The other window updates automatically without a refresh.

The dashboard shows **Live sync** after the Realtime channel subscribes successfully. If the connection drops, it changes to **Offline** and refreshes the latest task state when the browser reconnects.

## Architecture

```text
Browser A ─┐
           ├── Supabase Auth + PostgreSQL + Realtime
Browser B ─┘

Next.js renders the application and Vercel can host it. Each signed-in client connects directly to Supabase Realtime for database-change events.
```

## Security

The public Supabase publishable key is safe to use in the client only because Row-Level Security is enabled. Every policy requires the authenticated user ID to match the task owner:

```sql
(select auth.uid()) = user_id
```
