"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { BottomNav } from "./BottomNav";
import { Nutty } from "./Nutty";
import { ProfileForm } from "./ProfileForm";
import { SpeechBubble, Spinner } from "./ui";

/** Redirects signed-out users to "/" and makes new users pick a name + avatar first. */
export function Protected({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/");
  }, [loading, session, router]);

  if (loading || !session) return <Spinner />;

  if (!profile) {
    return (
      <main className="mx-auto max-w-md px-5 py-8">
        <div className="flex items-center gap-4">
          <Nutty pose="wave" size={110} />
          <SpeechBubble>Hey, I&apos;m Nutty! Who&apos;s taking the oath?</SpeechBubble>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Set up your profile</h1>
        <p className="mt-1 text-ink/70">Your groupmates will see your name and your Nutty.</p>
        <div className="mt-6">
          <ProfileForm />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-md px-5 pb-32 pt-6">{children}</main>
      <BottomNav />
    </>
  );
}
