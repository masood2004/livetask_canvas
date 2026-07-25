# LiveTask launch and submission checklist

## Public web deployment

### Vercel project

- Import `masood2004/livetask_canvas` into Vercel.
- Use the repository root as the project root.
- Keep the framework preset as Next.js.
- Use the default commands:

```text
Install: npm install
Build: npm run build
Output: managed automatically by Next.js
```

### Required Vercel environment variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Add them to Production, Preview and Development as needed. Redeploy after changing an environment variable.

### Supabase authentication configuration

In Supabase Authentication → URL Configuration:

```text
Site URL:
https://YOUR-PRODUCTION-DOMAIN

Redirect URLs:
https://YOUR-PRODUCTION-DOMAIN/auth/callback
http://localhost:3000/auth/callback
```

Keep the production domain on HTTPS.

## Production smoke test

Test the deployed application in an incognito/private window.

- Landing page loads.
- Signup or login page loads.
- Email/password authentication succeeds.
- Dashboard redirects unauthenticated visitors to login.
- Existing tasks load.
- Task creation works.
- Task editing works.
- Status update works.
- Deletion works.
- Search and filtering work.
- Realtime updates appear in a second session without refreshing.
- Canvas opens.
- Canvas drawing and undo/redo work.
- Board save and reopen work.
- PNG export works.
- Browser console contains no blocking production errors.

## Chrome extension test

- Load `extension/` through `chrome://extensions`.
- Configure the production LiveTask URL.
- Configure the Supabase URL and publishable key.
- Sign in.
- Create a task through the popup.
- Capture a webpage.
- Save selected text through the context menu.
- Open the side panel.
- Update task status.
- Confirm web synchronization.
- Confirm source links open.

## Android test

- Build from the latest `master` branch.
- Confirm the EAS preview environment contains:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_LIVETASK_WEB_URL
```

- Build with:

```bash
eas build -p android --profile preview --clear-cache
```

- Install the latest APK.
- Confirm the app remains open at startup.
- Sign in.
- Test task CRUD.
- Test Realtime with the web or desktop client.
- Preview a saved Canvas board.
- Open a source URL.

## Desktop test

- Start the Tauri client.
- Sign in.
- Test task CRUD and Realtime.
- Test keyboard shortcuts.
- Test source URL opening.
- Preview a Canvas board.
- Test system information and native notifications.

## Public access checks

Open every submission link in an incognito/private window:

- Public GitHub repository
- Production Vercel application
- Loom recording

A reviewer should not need to request access or sign in to GitHub, Drive or Loom just to open the submitted evidence.

## Recording checklist

Follow `docs/PRODUCT_DEMO_SCRIPT.md` and show:

- Product idea and architecture
- Authentication
- Main web flow
- Realtime between two clients
- HTML Canvas
- Chrome extension
- Android APK
- Tauri desktop app
- Public GitHub repository
- Production Vercel URL
- Final two-week proposal

## Final project proposal

Submit `docs/FINAL_PROJECT_PROPOSAL.md` as the proposed two-week build.

## Final submission fields

```text
Live Vercel URL: ______________________________
Public GitHub URL: https://github.com/masood2004/livetask_canvas
Loom video URL: _______________________________
Final project proposal: Smart Travel Planner AI
```

## Final security review

Before recording and submission:

- Do not commit `.env` or `.env.local`.
- Do not expose Supabase service-role credentials.
- Do not show passwords or secret keys in the recording.
- Verify Row-Level Security is enabled.
- Remove test accounts or records that should not be demonstrated.
- Confirm production environment variables use the correct Supabase project.
