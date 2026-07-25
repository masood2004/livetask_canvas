import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const rawSupabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

function isUsableValue(value: string | undefined) {
  return Boolean(value && !value.includes("your-project-id") && !value.includes("your_key_here"));
}

function isValidHttpUrl(value: string | undefined) {
  if (!isUsableValue(value)) return false;

  try {
    const parsed = new URL(value as string);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const hasValidUrl = isValidHttpUrl(rawSupabaseUrl);
const hasValidKey = isUsableValue(rawSupabaseKey);

export const mobileConfigurationError =
  hasValidUrl && hasValidKey
    ? null
    : "This Android build is missing its Supabase configuration. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the EAS environment used by the build, then create a new APK.";

// A syntactically valid fallback keeps the JavaScript bundle alive so the app can
// show a useful configuration screen instead of terminating during module import.
const supabaseUrl = hasValidUrl ? (rawSupabaseUrl as string) : "https://configuration-missing.supabase.co";
const supabaseKey = hasValidKey ? (rawSupabaseKey as string) : "configuration-missing-publishable-key";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

if (!mobileConfigurationError && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
