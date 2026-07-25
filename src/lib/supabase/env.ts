function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function getSupabaseConfig() {
  const url = firstDefined(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  );

  const publishableKey = firstDefined(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  );

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured for this deployment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel Project Settings → Environment Variables, enable Production, then redeploy.",
    );
  }

  return { url, publishableKey };
}

export function getOptionalSupabaseConfig() {
  try {
    return getSupabaseConfig();
  } catch {
    return null;
  }
}
