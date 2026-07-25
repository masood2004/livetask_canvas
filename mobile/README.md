# LiveTask Mobile

A minimal Android companion built with React Native and Expo. It connects to the same Supabase project as LiveTask web, Chrome and desktop.

## Included

- Supabase email/password authentication
- Persistent mobile session with AsyncStorage
- Task create, read, edit and delete
- Status, priority and due-date controls
- Search and status filters
- Real-time task synchronization
- Pull to refresh
- Browser-captured source links
- Saved Canvas board gallery and full-screen preview
- Links back to the web dashboard and Canvas editor
- Haptic feedback for important actions
- Minimal responsive interface

## Setup

```bash
cd mobile
npm install
cp .env.example .env
```

Set the same Supabase project URL and publishable key used by the web app:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
EXPO_PUBLIC_LIVETASK_WEB_URL=https://your-live-vercel-domain.vercel.app
```

When testing on a physical phone against the local Next.js server, use your computer's LAN address instead of `localhost`, for example `http://192.168.1.20:3000`.

Start Expo:

```bash
npx expo start
```

Scan the QR code with Expo Go or press `a` for an Android emulator.

## Android build

After confirming the app works in Expo Go, configure EAS and create an APK preview build:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

The app uses the public Supabase publishable key. Privacy is enforced by the existing Row-Level Security policies.
