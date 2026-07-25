# LiveTask product demonstration script

## Recording preparation

Before recording:

- Open the production web application in an incognito window.
- Keep a second browser session signed in to the same account for Realtime proof.
- Load the Chrome extension and keep its side panel ready.
- Install and sign in to the Android APK.
- Start the Tauri desktop application.
- Create one sample Canvas board and one browser-captured task.
- Confirm the GitHub repository, Vercel URL and recording link are publicly accessible.
- Hide secrets, environment files, passwords and private tokens.

## 1. Introduction

> LiveTask is a private productivity workspace that works across web, Chrome, Android and desktop. All clients use the same Supabase Authentication account, PostgreSQL database, Row-Level Security policies and Realtime events.

Show the landing page and briefly explain the product rather than the development assignment.

## 2. Architecture

```text
Next.js web ────────┐
Chrome extension ───┤
Expo Android ───────┼── Supabase Auth + PostgreSQL + Realtime
Tauri desktop ──────┘              │
                                   └── Row-Level Security
```

Explain:

- Next.js provides the main web workspace and Canvas editor.
- Supabase handles authentication, database storage and live changes.
- The Chrome extension captures tasks directly from browsing.
- Expo provides the Android client.
- Tauri provides the desktop shell, with Rust handling native commands.

## 3. Authentication and web workflow

1. Sign in through the production web application.
2. Show that the dashboard is protected.
3. Create a task with title, description, priority and due date.
4. Edit its details.
5. Move it from To do to In progress and Completed.
6. Use search and status filtering.
7. Explain that Row-Level Security limits records to the signed-in user.

## 4. Realtime proof

Keep two clients visible.

1. Create a task in Browser A.
2. Show it appearing automatically in Browser B or the desktop application.
3. Complete the same task from the second client.
4. Show the first client updating without a manual refresh.
5. Point out the live connection indicator.

## 5. Canvas workflow

1. Open Canvas from the web navigation.
2. Create a named board.
3. Demonstrate pen, highlighter, eraser and one shape tool.
4. Add a text label.
5. Show undo and redo.
6. Import an image or demonstrate the annotation capability.
7. Save the board privately.
8. Export it as PNG.
9. Reopen the saved board.

## 6. Chrome companion

1. Open a normal webpage.
2. Capture the page as a task through the extension popup or shortcut.
3. Select text on the page and save it through the context menu.
4. Open the extension side panel.
5. Search for the captured task.
6. Open the stored source URL.
7. Change the task status and show the change on the web dashboard.

## 7. Android application

1. Open the installed APK.
2. Sign in with the same account.
3. Show tasks, search and filters.
4. Create or update a task.
5. Demonstrate pull-to-refresh and Realtime synchronization.
6. Open the Boards tab and preview a saved Canvas board.
7. Open a browser-captured source link.

## 8. Desktop application

1. Open the Tauri application.
2. Explain that it uses a TypeScript frontend inside a Rust-powered native shell.
3. Create a task with `Ctrl/Cmd + N`.
4. Focus search with `Ctrl/Cmd + K`.
5. Open a stored source link through the native opener.
6. Preview a saved Canvas board.
7. Show the operating system and architecture returned by the Rust command.
8. Demonstrate a native notification.

## 9. Repository and production deployment

1. Open the public GitHub repository in an incognito window.
2. Show the repository structure.
3. Open the production Vercel URL in an incognito window.
4. Confirm login and the main application load correctly.
5. Mention that secrets are configured through deployment environments and are not committed.

## 10. Final project proposal

Open `docs/FINAL_PROJECT_PROPOSAL.md` and briefly present Smart Travel Planner AI:

- Fixed Trip Brief above the chat
- AI-guided itinerary planning
- Curated destination data
- 360/panorama preview with a visual fallback
- Saved and editable trips
- Two-week MVP scope

## Closing statement

> LiveTask demonstrates one synchronized product across four platforms, including authentication, CRUD, Realtime communication, HTML Canvas, a Chrome extension, Android and desktop clients. The next proposed product is Smart Travel Planner AI, scoped as a focused two-week MVP.
