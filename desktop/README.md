# LiveTask Desktop

A lightweight desktop client built with Tauri 2, Rust, Vite and TypeScript. It shares the same Supabase account and private data as LiveTask web, Chrome and Android.

## Included

- Supabase email/password authentication
- Persistent desktop session
- Complete task CRUD
- Search and status filters
- Real-time task synchronization
- Browser-captured source links opened through the native opener plugin
- Canvas board gallery and full-screen previews
- Native due-today notifications
- Rust system-information command
- Keyboard shortcuts
- Minimal desktop interface

## Requirements

Install:

- Node.js LTS
- Rust through `rustup`
- Linux build dependencies required by Tauri, or the corresponding Windows/macOS prerequisites

For Ubuntu/Debian:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Setup

```bash
cd desktop
npm install
cp .env.example .env
```

Use the same Supabase project as the web application:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
VITE_LIVETASK_WEB_URL=https://your-live-vercel-domain.vercel.app
```

Run the native app:

```bash
npm run desktop
```

Build an installer/package:

```bash
npm run tauri build
```

## Shortcuts

- `Ctrl/Cmd + N`: create a task
- `Ctrl/Cmd + K`: open Tasks and focus search
- `Escape`: close the current dialog

The public Supabase key is safe in the client because the existing Row-Level Security policies restrict every task and board to its authenticated owner.
