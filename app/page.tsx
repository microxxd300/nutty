"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Nutty, type Pose } from "@/components/Nutty";
import { ErrorText, SpeechBubble } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const FEATURES: { pose: Pose; title: string; body: string }[] = [
  { pose: "flex", title: "Daily check-in", body: "One tap a day. Honor system. Your calendar fills up gold." },
  { pose: "celebrate", title: "Friend leaderboards", body: "Make a group, share the code, see who's still standing." },
  { pose: "trophy", title: "Trophy card", body: "Survive all 30 days and get a share-ready champion card." },
];

export default function Landing() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace("/home");
  }, [loading, session, router]);

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    // On success the browser leaves for Google and comes back to /home.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div
        suppressHydrationWarning
        className="sticker w-fit rounded-xl bg-band px-3 py-1 font-display text-sm font-bold text-white"
      >
        NNN {new Date().getFullYear()}
      </div>

      <div className="mt-6 flex items-end gap-3">
        <Nutty pose="wave" size={130} className="shrink-0" />
        <div className="mb-6">
          <SpeechBubble>I&apos;m Nutty. Let&apos;s get through November together.</SpeechBubble>
        </div>
      </div>

      <h1 className="mt-6 font-display text-5xl leading-[0.95] font-bold">
        30 days.
        <br />
        No excuses.
        <br />
        <span className="text-band">Bragging rights.</span>
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        The No Nut November tracker for you and the group chat. Check in, climb the board, earn the trophy.
      </p>

      <div className="sticker mt-8 bg-white p-5">
        <button onClick={signInWithGoogle} disabled={busy} className="btn bg-white text-ink">
          <span className="flex items-center justify-center gap-3">
            <GoogleLogo />
            {busy ? "Opening Google…" : "Continue with Google"}
          </span>
        </button>
        <ErrorText>{error}</ErrorText>
        <p className="mt-3 text-center text-xs text-ink/50">We only use your name and email to set up your profile.</p>
      </div>

      <ul className="mt-10 space-y-4">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex items-center gap-4">
            <Nutty pose={f.pose} size={64} className="shrink-0" />
            <div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="text-sm text-ink/70">{f.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-auto pt-12 text-center text-xs font-semibold text-ink/50">
        Honor system. Touch grass. Drink water. You got this.
      </p>
    </main>
  );
}

/** Google's standard "G" mark (required as-is on Google sign-in buttons). */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
