const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

const missing = required.filter((name) => {
  const value = process.env[name]?.trim();
  return !value || value.includes("your-project-id") || value.includes("your_key_here");
});

if (missing.length > 0) {
  console.error("\nLiveTask Android build stopped before creating a broken APK.");
  console.error(`Missing build variables: ${missing.join(", ")}`);
  console.error("Add them to the EAS environment selected by the build profile, then rebuild.\n");
  process.exit(1);
}

try {
  const url = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Supabase URL must use http or https.");
  }
} catch (error) {
  console.error("\nEXPO_PUBLIC_SUPABASE_URL is not a valid URL.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

if (!process.env.EXPO_PUBLIC_LIVETASK_WEB_URL) {
  console.warn("EXPO_PUBLIC_LIVETASK_WEB_URL is not set. Web links will fall back to localhost.");
}

console.log("LiveTask mobile build environment is configured.");
