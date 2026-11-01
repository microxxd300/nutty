"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "@/components/AuthProvider";
import { Protected } from "@/components/Protected";
import { TrophyCard, type CardVariant } from "@/components/TrophyCard";
import { ErrorText, inputClass, primaryButton, secondaryButton, Spinner } from "@/components/ui";
import { getChallenge, summarize, type Summary } from "@/lib/challenge";
import { fetchCheckins, loadLeaderboard } from "@/lib/leaderboard";
import { CARD_HEIGHT, CARD_WIDTH, downloadBlob, renderCard, shareBlob } from "@/lib/shareCard";
import { supabase } from "@/lib/supabase";

type Stats = { summary: Summary; rank: number | null; total: number | null; groupName: string | null };

export default function TrophyPage() {
  return (
    <Protected>
      <Suspense fallback={<Spinner />}>
        <TrophyScreen />
      </Suspense>
    </Protected>
  );
}

function TrophyScreen() {
  const profile = useProfile();
  const info = useMemo(() => getChallenge(profile.timezone), [profile.timezone]);
  const [groups, setGroups] = useState<{ id: string; name: string }[] | null>(null);
  const groupFromUrl = useSearchParams().get("group");
  const [selected, setSelected] = useState<string | null>(groupFromUrl);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);

  useEffect(() => {
    supabase
      .from("groups")
      .select("id,name")
      .order("created_at")
      .then(({ data, error }) => (error ? setError(error.message) : setGroups(data)));
  }, []);

  // The group used for rank: the one picked, else your first group, else none (solo card).
  const groupId = groups ? (groups.find((g) => g.id === selected)?.id ?? groups[0]?.id ?? null) : undefined;

  useEffect(() => {
    if (groupId === undefined) return;
    let cancelled = false;
    (async (): Promise<Stats> => {
      if (groupId) {
        const board = await loadLeaderboard(groupId, info);
        const me = board?.entries.find((e) => e.user_id === profile.id);
        if (board && me) {
          return { summary: me.summary, rank: me.rank, total: board.entries.length, groupName: board.group.name };
        }
      }
      const mine = await fetchCheckins([profile.id], info.year);
      return { summary: summarize(mine, info), rank: null, total: null, groupName: null };
    })()
      .then((s) => !cancelled && setStats(s))
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [groupId, info, profile.id]);

  // Scale the full-size 1080×1350 card down to fit the screen for preview.
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    // Minus the sticker's 3px borders on each side.
    const ro = new ResizeObserver(([entry]) => setScale((entry.contentRect.width - 6) / CARD_WIDTH));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stats !== null]);

  const s = stats?.summary;
  const variant: CardVariant | null = !s ? null : !s.isActive ? "out" : info.phase === "over" ? "champion" : "progress";
  const cardProps =
    stats && s && variant
      ? {
          variant,
          year: info.year,
          displayName: profile.display_name,
          avatar: profile.avatar,
          day: info.day,
          daysSurvived: s.daysSurvived,
          fellOnDay: s.fellOnDay,
          streak: s.streak,
          okCount: s.okCount,
          rank: stats.rank,
          total: stats.total,
          groupName: stats.groupName,
        }
      : null;

  // Pre-render the PNG so tapping Share opens the share sheet instantly
  // (iOS Safari drops the "user tapped" permission if we take too long).
  const blobRef = useRef<Blob | null>(null);
  const cardKey = cardProps ? JSON.stringify(cardProps) : "";
  useEffect(() => {
    blobRef.current = null;
    if (!cardKey) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cardRef.current) return;
      renderCard(cardRef.current)
        .then((blob) => {
          if (!cancelled) blobRef.current = blob;
        })
        .catch(() => {}); // we'll retry on click
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cardKey]);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!cardProps) return <Spinner />;

  const filename = `nnn-${info.year}-${variant}.png`;
  const tag = `#NNN${info.year}`;
  const shareText = {
    champion: `I survived all 30 days of No Nut November ${info.year}. ${tag}`,
    out: `I made it ${cardProps.daysSurvived} days in No Nut November ${info.year}. Respect the grind. ${tag}`,
    progress: `Day ${info.day} of No Nut November and still going. ${tag}`,
  }[cardProps.variant];

  async function getBlob() {
    if (!blobRef.current) blobRef.current = await renderCard(cardRef.current!);
    return blobRef.current;
  }

  async function run(kind: "save" | "share") {
    setBusy(kind);
    try {
      const blob = await getBlob();
      if (kind === "save") downloadBlob(blob, filename);
      else await shareBlob(blob, filename, shareText);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const heading = {
    champion: "Champion.",
    out: "Run's over, legend.",
    progress: "Still standing.",
  }[cardProps.variant];

  return (
    <>
      <h1 className="font-display text-4xl font-bold">{heading}</h1>
      <p className="mt-1 text-ink/70">
        {cardProps.variant === "progress"
          ? "Post your progress. Peer pressure is a feature."
          : "Your official NNN card. Post it with pride."}
      </p>

      {groups && groups.length > 1 && (
        <select
          className={`${inputClass} mt-4`}
          value={groupId ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Group for rank"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Rank in: {g.name}
            </option>
          ))}
        </select>
      )}

      <div ref={boxRef} className="mt-5 w-full">
        <div className="sticker overflow-hidden" style={{ height: CARD_HEIGHT * scale + 6 }}>
          <div
            style={{ width: CARD_WIDTH, height: CARD_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            <TrophyCard ref={cardRef} {...cardProps} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <button onClick={() => run("save")} disabled={busy !== null} className={secondaryButton}>
          {busy === "save" ? "Rendering…" : "Save image"}
        </button>
        <button onClick={() => run("share")} disabled={busy !== null} className={primaryButton}>
          {busy === "share" ? "Rendering…" : "Share"}
        </button>
      </div>
    </>
  );
}
