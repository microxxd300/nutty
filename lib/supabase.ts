import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's dashboard now calls this the "publishable" key; accept either name.
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local (see README).",
  );
}

// Everything in this bundle is public. Refuse to run with an admin key.
if (anonKey.startsWith("sb_secret_") || jwtRole(anonKey) === "service_role") {
  throw new Error("That's the service_role / secret key. Use the anon (publishable) key in the frontend.");
}

function jwtRole(key: string): string | null {
  try {
    return JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role ?? null;
  } catch {
    return null;
  }
}

export const supabase = createClient(url, anonKey);
