# LiveTask

LiveTask is a minimal, private productivity workspace that stays synchronized across web, Chrome, Android and desktop. It combines real-time task management with a visual HTML Canvas workspace for planning, diagrams, annotations and quick thinking.

## Product surfaces

### Web application

- Next.js 16 and TypeScript
- Supabase email/password authentication
- Protected task workspace
- Complete task CRUD
- Status, priority, due dates, search and filtering
- Real-time synchronization across sessions
- Visual HTML Canvas editor
- Private whiteboard storage

### Chrome companion

- Quick task creation
- Persistent side panel
- View, filter, update and delete tasks
- Capture the current webpage, selected text or a link
- Preserve source URLs inside tasks
- Badge count and due-today notifications

### Android application

- React Native with Expo
- Persistent Supabase session
- Complete task CRUD and real-time synchronization
- Search, filters, pull to refresh and haptic feedback
- Browser-source links
- Saved Canvas board gallery and preview
- Links to the full web Canvas editor

### Desktop application

- Tauri 2 native shell with Rust
- Vite and TypeScript frontend
- Complete task CRUD and real-time synchronization
- Canvas board gallery
- Native URL opening and notifications
- Rust system-information command
- Keyboard shortcuts

## Shared architecture

```text
Next.js web ────────┐
Chrome extension ───┤
Expo Android ───────┼── Supabase Auth + PostgreSQL + Realtime
Tauri desktop ──────┘              │
                                   └── Row-Level Security
```

Every client uses the Supabase publishable key. Data remains private because each database policy requires the signed-in user ID to match the record owner.

## Repository structure

```text
livetask_canvas/
├── src/                 Next.js web application
├── extension/           Chrome Manifest V3 extension
├── mobile/              React Native Expo application
├── desktop/             Tauri 2 + Rust desktop application
├── supabase/            Shared database schema and RLS policies
└── docs/                Demonstration and architecture notes
```

## Web setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run `supabase/schema.sql` once in the Supabase SQL Editor. It creates the tasks and whiteboards tables, Realtime configuration and Row-Level Security policies.

## Android setup

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

See `mobile/README.md` for Expo Go and Android APK build steps.

## Desktop setup

```bash
cd desktop
npm install
cp .env.example .env
npm run desktop
```

See `desktop/README.md` for Rust and platform prerequisites.

## Chrome setup

Open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose the `extension` folder. Configure the Supabase project URL, publishable key and LiveTask web URL from the extension options page.
