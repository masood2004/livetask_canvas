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

## Local setup

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

```bash
npx expo start
```

Scan the QR code with Expo Go or press `a` for an Android emulator.

## Required EAS environment setup

Local `.env` files are intentionally excluded from Git. A cloud APK build therefore needs the same values in the EAS environment selected by the build profile.

Create the variables for the `preview` environment before building the installable APK:

```bash
eas env:create \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://your-project-id.supabase.co" \
  --environment preview \
  --visibility plaintext

eas env:create \
  --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --value "sb_publishable_your_key_here" \
  --environment preview \
  --visibility sensitive

eas env:create \
  --name EXPO_PUBLIC_LIVETASK_WEB_URL \
  --value "https://your-live-vercel-domain.vercel.app" \
  --environment preview \
  --visibility plaintext
```

Confirm that EAS has the variables:

```bash
eas env:list --environment preview
```

The `preview` build profile is explicitly connected to the EAS `preview` environment in `eas.json`.

## Build the repaired APK

```bash
npm install -g eas-cli
eas login
npm run validate:env
eas build -p android --profile preview --clear-cache
```

You can also use:

```bash
npm run build:apk
```

The build now runs `scripts/validate-env.mjs` on the EAS builder. If a required value is absent, the build fails before producing an APK instead of creating an app that terminates at startup.

The app also contains a startup recovery screen. If a manually produced build is missing configuration, it stays open and explains which EAS variables are required.

## Installing the replacement

The repaired Android build is version `1.0.1` with `versionCode` `2`. Uninstall the broken APK if Android does not replace it automatically, then install the new APK generated from the latest commit.

## Optional device log check

If a rebuilt APK still fails, connect the phone with USB debugging enabled and run:

```bash
adb logcat -c
adb logcat ReactNativeJS:E AndroidRuntime:E '*:S'
```

Open LiveTask while the command is running and copy the first error block. The app-level error boundary should keep recoverable JavaScript render errors visible on screen, while Logcat will reveal native startup failures.

## Security

The application uses the public Supabase publishable key. Privacy is enforced by the existing Row-Level Security policies. Do not place a service-role key in the mobile app or any `EXPO_PUBLIC_` variable.
