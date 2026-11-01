"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/components/AuthProvider";
import { Calendar } from "@/components/Calendar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Nutty, NuttyAvatar, type Pose } from "@/components/Nutty";
import { ProfileForm } from "@/components/ProfileForm";
import { Protected } from "@/components/Protected";
import { ErrorText, peanutButton, primaryButton, dangerButton, SpeechBubble, Spinner } from "@/components/ui";
import {
  getChallenge,
  summarize,
  TOTAL_DAYS,
  type ChallengeInfo,
  type Checkin,
  type Status,
  type Summary,
} from "@/lib/challenge";
import { fetchCheckins } from "@/lib/leaderboard";
import { supabase } from "@/lib/supabase";

const QUOTES = [
  "Discipline > dopamine.",
  "The urge is temporary. The trophy is forever.",
  "Go for a walk. Seriously. Right now.",
  "Cold showers are free.",
  "Hydrate or die-drate.",
  "Your future self is watching. Make them proud.",
  "Delete the app. You know which one.",
  "Do 20 push-ups. Then check back in.",
  "Boredom is the boss fight.",
  "Main character energy only.",
];

/** What Nutty is doing and saying, based on where you are in the challenge. */
function nuttyMood(info: ChallengeInfo, s: Summary): { pose: Pose; line: string } {
  if (!s.isActive) {
    return { pose: "fallen", line: `Out on Day ${s.fellOnDay}. Respect for the honesty.` };
  }
  if (info.phase === "over") return { pose: "trophy", line: "WE DID IT. Champion status unlocked!" };
  if (info.phase === "before") {
    return { pose: "meditate", line: `${info.daysUntilStart} days to go. Breathe. Prepare.` };
  }
  if (!s.checkedInToday) return { pose: "nervous", line: "So… did we survive today?" };
  if (s.streak >= 7) return { pose: "on-fire", line: `${s.streak} days straight. We're on fire!` };
  return { pose: "flex", line: QUOTES[info.day % QUOTES.length] };
}

export default function HomePage() {
  return (
    <Protected>
      <HomeScreen />
    </Protected>
  );
}

function HomeScreen() {
  const profile = useProfile();
  const info = useMemo(() => getChallenge(profile.timezone), [profile.timezone]);
  const [checkins, setCheckins] = useState<Checkin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmFell, setConfirmFell] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      setCheckins(await fetchCheckins([profile.id], info.year));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [profile.id, info.year]);

  useEffect(() => {
    load();
  }, [load]);

  async function checkIn(status: Status) {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("check_in", { status });
    setBusy(false);
    setConfirmFell(false);
    if (error) setError(error.message);
    else await load();
  }

  if (editing) {
    return (
      <>
        <h1 className="mb-6 font-display text-3xl font-bold">Edit profile</h1>
        <ProfileForm existing={profile} onDone={() => setEditing(false)} />
      </>
    );
  }

  if (!checkins) return error ? <ErrorText>{error}</ErrorText> : <Spinner />;

  const summary = summarize(checkins, info);
  const mood = nuttyMood(info, summary);

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between">
        <button onClick={() => setEditing(true)} className="flex items-center gap-3 text-left">
          <NuttyAvatar pose={profile.avatar} size={46} />
          <span>
            <span className="block font-display text-lg font-bold leading-tight">{profile.display_name}</span>
            <span className="block text-xs font-semibold text-ink/50">Edit profile</span>
          </span>
        </button>
        <button onClick={() => supabase.auth.signOut()} className="font-display text-sm font-semibold text-ink/60">
          Sign out
        </button>
      </header>

      {/* Day */}
      <section className="mt-7">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-band">
          No Nut November {info.year}
        </p>
        <h1 className="font-display text-6xl font-bold tracking-tight">
          {info.phase === "before" && "Not yet"}
          {info.phase === "live" && (
            <>
              Day {info.day}
              <span className="text-ink/30"> / {TOTAL_DAYS}</span>
            </>
          )}
          {info.phase === "over" && "That's a wrap"}
        </h1>
        <div className="mt-3 h-5 overflow-hidden rounded-full border-[3px] border-ink bg-white">
          <div
            className="headband h-full border-r-[3px] border-ink"
            style={{ width: `${(info.day / TOTAL_DAYS) * 100}%` }}
          />
        </div>
      </section>

      {/* Nutty */}
      <section className="mt-6 flex items-center gap-3">
        <Nutty pose={mood.pose} size={124} className="shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 pl-2">
          <SpeechBubble>{mood.line}</SpeechBubble>
          <p className="pl-1 font-display font-semibold">
            <span className="text-3xl font-bold text-band">{summary.streak}</span> day streak
          </p>
        </div>
      </section>

      {/* Check-in */}
      <section className="mt-6">
        {info.phase === "live" && summary.isActive && !summary.checkedInToday && (
          <div className="grid gap-4">
            <button onClick={() => checkIn("ok")} disabled={busy} className={`${peanutButton} py-6 text-2xl`}>
              Still standing
            </button>
            <button onClick={() => setConfirmFell(true)} disabled={busy} className={dangerButton}>
              I fell
            </button>
          </div>
        )}

        {info.phase === "live" && summary.isActive && summary.checkedInToday && (
          <div className="sticker bg-peanut p-5">
            <p className="font-display text-xl font-bold">Checked in for today</p>
            <p className="mt-1 font-semibold text-ink/75">See you tomorrow, soldier.</p>
            <button onClick={() => setConfirmFell(true)} className="mt-3 text-sm font-semibold text-ink/60 underline">
              Actually… I fell later today
            </button>
          </div>
        )}

        {!summary.isActive && (
          <div className="sticker bg-white p-5">
            <p className="font-display text-xl font-bold text-band">Out on Day {summary.fellOnDay}</p>
            <p className="mt-1 text-ink/75">
              You survived {summary.daysSurvived} day{summary.daysSurvived === 1 ? "" : "s"}. You can still cheer on
              your group.
            </p>
          </div>
        )}

        {info.phase === "over" && summary.isActive && (
          <Link href="/trophy" className={`${primaryButton} text-center text-xl`}>
            Claim your trophy
          </Link>
        )}

        <ErrorText>{error}</ErrorText>
      </section>

      {/* Calendar */}
      <section className="mt-10">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-ink/60">
          Your November
        </h2>
        <Calendar info={info} summary={summary} />
      </section>

      {info.phase !== "over" && (
        <Link href="/trophy" className="sticker mt-8 flex items-center gap-3 bg-white p-4">
          <Nutty pose="celebrate" size={56} className="shrink-0" />
          <span className="flex-1">
            <span className="block font-display text-lg font-bold">Flex your progress</span>
            <span className="block text-sm text-ink/60">Make a share card for the group chat</span>
          </span>
          <span className="font-display text-2xl font-bold" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      )}

      <ConfirmDialog
        open={confirmFell}
        title="Confirm you fell?"
        body={`This ends your run for ${info.year} and can't be undone. Your groups will see "Out on Day ${info.day}".`}
        confirmLabel="Yes, I fell"
        busy={busy}
        onConfirm={() => checkIn("fell")}
        onCancel={() => setConfirmFell(false)}
      />
    </>
  );
}
