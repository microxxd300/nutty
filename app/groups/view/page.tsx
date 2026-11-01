"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/components/AuthProvider";
import { Nutty, NuttyAvatar } from "@/components/Nutty";
import { Protected } from "@/components/Protected";
import { ErrorText, primaryButton, Spinner } from "@/components/ui";
import { getChallenge } from "@/lib/challenge";
import { loadLeaderboard, type Entry, type Group } from "@/lib/leaderboard";

// Leaderboard lives at /groups/view?id=… rather than /groups/[id]:
// a static export can't pre-render group IDs that only exist at runtime.
export default function LeaderboardPage() {
  return (
    <Protected>
      <Suspense fallback={<Spinner />}>
        <Leaderboard />
      </Suspense>
    </Protected>
  );
}

// Gold, silver, bronze for the podium.
const PODIUM = ["bg-[#FFC93C]", "bg-[#DADADA]", "bg-[#E7A36B]"];

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-ink font-display font-bold ${
        PODIUM[rank - 1] ?? "bg-white"
      }`}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

function Leaderboard() {
  const profile = useProfile();
  const groupId = useSearchParams().get("id") ?? "";
  const info = useMemo(() => getChallenge(profile.timezone), [profile.timezone]);
  const [data, setData] = useState<{ group: Group; entries: Entry[] } | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadLeaderboard(groupId, info)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [groupId, info]);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (data === undefined) return <Spinner />;
  if (data === null) {
    return (
      <div className="py-16 text-center">
        <Nutty pose="nervous" size={120} className="mx-auto" />
        <p className="mt-2 font-display text-2xl font-bold">Group not found</p>
        <p className="text-ink/60">It doesn&apos;t exist or you&apos;re not a member.</p>
        <Link href="/groups" className="mt-4 inline-block font-display font-semibold text-band underline">
          Back to groups
        </Link>
      </div>
    );
  }

  const { group, entries } = data;
  const activeCount = entries.filter((e) => e.summary.isActive).length;

  async function shareInvite() {
    const text = `Join my No Nut November group "${group.name}" on NNN Tracker. Code: ${group.invite_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url: window.location.origin });
        return;
      } catch {
        // cancelled or unsupported — fall through to copy
      }
    }
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Link href="/groups" className="font-display text-sm font-semibold text-ink/60">
        &larr; Groups
      </Link>
      <h1 className="mt-1 font-display text-4xl font-bold break-words">{group.name}</h1>
      <p className="mt-1 font-semibold text-ink/70">
        {activeCount} of {entries.length} still standing
        {info.phase === "live" && ` · Day ${info.day}`}
      </p>

      <button
        onClick={shareInvite}
        className="sticker mt-5 flex w-full items-center justify-between border-dashed bg-shell p-4 text-left"
      >
        <span>
          <span className="block text-xs font-bold uppercase tracking-widest text-ink/60">Invite code</span>
          <span className="block font-mono text-2xl font-bold tracking-[0.3em]">{group.invite_code}</span>
        </span>
        <span className="font-display font-bold text-band">{copied ? "Copied!" : "Share"}</span>
      </button>

      <ol className="mt-6 space-y-3">
        {entries.map((e) => {
          const isMe = e.user_id === profile.id;
          return (
            <li
              key={e.user_id}
              className={`flex items-center gap-3 rounded-2xl border-[3px] p-3 ${
                isMe ? "border-ink bg-peanut shadow-[4px_4px_0_var(--color-ink)]" : "border-ink/15 bg-white"
              }`}
            >
              <RankBadge rank={e.rank} />
              <NuttyAvatar
                pose={e.summary.isActive ? e.avatar : "fallen"}
                size={44}
                className={e.summary.isActive ? "" : "grayscale"}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-lg font-bold leading-tight">
                  {e.display_name}
                  {isMe && <span className="ml-1 text-xs font-semibold">(you)</span>}
                </span>
                <span className={`text-xs font-bold ${e.summary.isActive ? "text-ink/60" : "text-band"}`}>
                  {e.summary.isActive ? "Active" : `Out on Day ${e.summary.fellOnDay}`}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-2xl font-bold leading-none">{e.summary.streak}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-ink/50">streak</span>
              </span>
            </li>
          );
        })}
      </ol>

      <Link href={`/trophy?group=${group.id}`} className={`${primaryButton} mt-8 text-center`}>
        Make my card for this group
      </Link>
    </>
  );
}
