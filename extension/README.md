# LiveTask Companion

A Manifest V3 Chrome extension for the LiveTask web workspace. It uses the same Supabase Authentication session model, PostgreSQL `tasks` table and Row-Level Security policies as the web app.

## What it does

- Sign in with the same LiveTask email and password.
- Add tasks from a compact popup.
- Keep a persistent task list in Chrome's side panel.
- Complete, start and delete tasks without opening the website.
- Save the current page as a task with its title and source URL.
- Save selected webpage text through the right-click menu.
- Show the number of incomplete tasks on the extension badge.
- Notify the user about incomplete tasks due today.
- Open the dashboard through a configurable keyboard shortcut.
- Refresh the side panel automatically while it remains open.

## Install locally

1. Run the updated `supabase/schema.sql` in Supabase SQL Editor. This adds optional `source_url` and `source_title` columns to existing tasks.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the `extension` folder itself.
6. Open the extension's **Options** page.
7. Enter the same Supabase URL and publishable key used by the Next.js app.
8. Enter the local or deployed LiveTask URL and save.
9. Open the popup and sign in.

No build step and no remotely hosted JavaScript are used. All extension code is included in the package.

## Browser shortcuts

- `Alt + Shift + Y`: save the current webpage as a task.
- `Alt + Shift + L`: open the LiveTask dashboard.

Chrome may change or reject a shortcut when it conflicts with the operating system. Manage shortcuts at `chrome://extensions/shortcuts`.

## Security

The extension stores its session in `chrome.storage.local` and sends the user's JWT to Supabase. The Supabase publishable key is not a secret; database access remains restricted by the existing Row-Level Security policies. Never place a service-role key in the extension.
