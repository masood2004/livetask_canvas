# LiveTask

LiveTask is a minimal, private productivity workspace built with Next.js and Supabase. It combines real-time task management with a visual HTML Canvas workspace for planning, diagrams, annotations and quick thinking.

## Features

### Task workspace
- Email/password authentication
- Protected personal workspace
- Complete task CRUD
- Status, priority, due dates, search and filtering
- Real-time synchronization across browser sessions
- Live connection indicator

### Visual Canvas workspace
- Freehand pen and transparent highlighter
- Pressure-friendly pointer drawing for mouse, touch and stylus
- Eraser with adjustable size
- Line, arrow, rectangle and ellipse tools
- Text labels
- Color presets and custom color picker
- Adjustable brush size
- Undo and redo history
- Clear board with confirmation
- Dot-grid toggle
- Multiple board background colors
- Zoom controls
- Image import and annotation
- PNG export with selected background
- Automatic browser-local recovery
- Private cloud save, update, load and delete
- Optional link between a board and an existing task

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- HTML Canvas API
- Supabase Authentication
- Supabase PostgreSQL and Realtime
- Row-Level Security
- `@supabase/ssr`
- Responsive CSS

## Setup

```bash
npm install
cp .env.example .env.local
```

Add your Supabase values to `.env.local`, then run the complete SQL file in **Supabase → SQL Editor**:

```text
supabase/schema.sql
```

The SQL creates the private `tasks` and `whiteboards` tables, triggers, indexes, Realtime publication configuration and Row-Level Security policies.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Canvas workflow

1. Open **Canvas** from the workspace navigation.
2. Draw, annotate an imported image, create a diagram or add text.
3. The current board is recovered locally while you work.
4. Use **Save board** to store it privately in Supabase.
5. Reopen saved boards from the sidebar or export the result as PNG.

## Security

The browser uses only the Supabase publishable key. Row-Level Security ensures that authenticated users can only access tasks and whiteboards where `user_id = auth.uid()`. Never expose a service-role key in frontend code.
