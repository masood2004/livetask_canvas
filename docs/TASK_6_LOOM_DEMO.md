# LiveTask cross-platform demonstration

## 1. Product overview

LiveTask is one private productivity workspace available through web, Chrome, Android and desktop. All clients use the same Supabase Authentication account, PostgreSQL tables, Row-Level Security policies and Realtime events.

## 2. Android demonstration

1. Start the Expo application and sign in with the same LiveTask account.
2. Show the task summary, search and status filters.
3. Create a new task from Android.
4. Keep the web dashboard open and show the task appearing there through Realtime.
5. Edit the task, change its status and delete or reopen it.
6. Open the Boards tab and preview a Canvas board saved from the web application.
7. Open Account and show the links to the web dashboard and Canvas editor.

## 3. Desktop demonstration

1. Run `npm run desktop` and explain that the shell is Tauri 2 with Rust.
2. Sign in with the same Supabase account.
3. Show task CRUD and the Live sync indicator.
4. Create a task using `Ctrl/Cmd + N`.
5. Search using `Ctrl/Cmd + K`.
6. Open a Chrome-captured source link through the native opener plugin.
7. Open Boards and preview a saved Canvas image.
8. Open Desktop settings and show the operating system and architecture returned by the Rust command.
9. Test a native desktop notification.

## 4. Cross-platform proof

Keep two or more clients open. Create, update or complete a task in one client and show the other clients updating without a manual refresh.

## 5. Architecture explanation

```text
Web / Chrome / Android / Desktop
                │
                ├── Supabase Auth
                ├── PostgreSQL tasks + whiteboards
                ├── Row-Level Security
                └── Supabase Realtime
```

The Android app is built with React Native and Expo. The desktop client uses a TypeScript frontend inside a Tauri 2 native shell, with Rust providing native commands. No service-role key is included in any client.
