import type { Ref } from "react";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/shareCard";
import { TOTAL_DAYS } from "@/lib/challenge";
import { Nutty, NuttyAvatar, type Pose } from "./Nutty";

export type CardVariant = "champion" | "out" | "progress";

export type TrophyCardProps = {
  variant: CardVariant;
  year: number;
  displayName: string;
  avatar: string;
  day: number;
  daysSurvived: number;
  fellOnDay: number | null;
  streak: number;
  okCount: number;
  rank: number | null;
  total: number | null;
  groupName: string | null;
  ref?: Ref<HTMLDivElement>;
};

// Literal colors (not CSS vars) so the exported PNG never depends on the page's stylesheet.
const CREAM = "#FFF4DF";
const PEANUT = "#F4B455";
const BAND = "#E3192E";
const INK = "#2A1508";

/** The 1080×1350 share image. Rendered at full size; the trophy page scales it down for preview. */
export function TrophyCard(props: TrophyCardProps) {
  const { variant, year, displayName, avatar, day, daysSurvived, fellOnDay, streak, okCount, rank, total, groupName, ref } =
    props;

  const variants: Record<CardVariant, { pose: Pose; kicker: string; number: number; label: string; tagline: string }> = {
    champion: {
      pose: "trophy",
      kicker: "CHAMPION",
      number: TOTAL_DAYS,
      label: "DAYS SURVIVED",
      tagline: "Unbroken. Unbothered. Undefeated.",
    },
    out: {
      pose: "fallen",
      kicker: "SURVIVED",
      number: daysSurvived,
      label: daysSurvived === 1 ? "DAY" : "DAYS",
      tagline: `Fell on Day ${fellOnDay}. Honesty is also a flex.`,
    },
    progress: {
      pose: day === 0 ? "meditate" : "on-fire",
      kicker: "DAY",
      number: day,
      label: day === 0 ? "LOCKED IN FOR NOV 1" : "AND STILL GOING",
      tagline:
        day >= TOTAL_DAYS ? "Final day. Finish strong." : `${TOTAL_DAYS - day} days to the trophy. Stay hydrated.`,
    },
  };
  const content = variants[variant];

  return (
    <div
      ref={ref}
      className="relative flex flex-col overflow-hidden font-sans"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        color: INK,
        // Peanut-shell speckle on cream.
        background: `radial-gradient(circle, rgba(224,138,42,0.16) 4px, transparent 4.5px) 0 0 / 54px 54px, ${CREAM}`,
      }}
    >
      <Headband height={44} edge="bottom" />

      <div className="flex flex-1 flex-col" style={{ padding: "40px 72px 50px" }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-8">
          <div
            className="shrink-0 rounded-2xl px-6 py-2 font-display text-[38px] font-bold text-white"
            style={{ background: BAND, border: `5px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}
          >
            NNN {year}
          </div>
          <div className="truncate font-display text-[32px] font-semibold uppercase tracking-[0.08em] opacity-70">
            {groupName ?? "Solo run"}
          </div>
        </div>

        {/* Nutty */}
        <div className="relative mt-2 flex h-[390px] items-center justify-center">
          <div
            className="absolute rounded-full"
            style={{ width: 340, height: 340, background: PEANUT, border: `6px solid ${INK}`, opacity: 0.55 }}
          />
          <Nutty pose={content.pose} size={410} className="relative" />
        </div>

        {/* Big number */}
        <div className="text-center">
          <div className="font-display text-[68px] font-bold leading-none tracking-[0.12em]" style={{ color: BAND }}>
            {content.kicker}
          </div>
          <div
            className="font-display text-[230px] font-bold leading-[0.9] tracking-[-0.02em]"
            style={{ textShadow: `10px 10px 0 ${PEANUT}` }}
          >
            {content.number}
          </div>
          <div className="font-display text-[46px] font-bold tracking-[0.06em]">{content.label}</div>
          <div className="mt-1 text-[30px] font-semibold opacity-70">{content.tagline}</div>
        </div>

        {/* Stats */}
        <div className="mt-auto grid grid-cols-3 gap-6">
          <Stat label="GROUP RANK" value={rank ? `#${rank}` : "-"} sub={total ? `of ${total}` : undefined} />
          <Stat label="STREAK" value={String(streak)} sub="days" />
          <Stat label="CHECK-INS" value={String(okCount)} sub={`of ${TOTAL_DAYS}`} />
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-5">
            <NuttyAvatar pose={avatar} size={100} />
            <div className="truncate font-display text-[52px] font-bold">{displayName}</div>
          </div>
          <div className="shrink-0 text-right font-display text-[24px] font-semibold uppercase leading-tight tracking-[0.18em] opacity-60">
            No Nut
            <br />
            November
          </div>
        </div>
      </div>

      <Headband height={28} edge="top" />
    </div>
  );
}

function Headband({ height, edge }: { height: number; edge: "top" | "bottom" }) {
  return (
    <div
      className="shrink-0"
      style={{
        height,
        background: `linear-gradient(180deg, ${BAND} 0 30%, #FFFFFF 30% 46%, ${BAND} 46% 100%)`,
        [edge === "bottom" ? "borderBottom" : "borderTop"]: `5px solid ${INK}`,
      }}
    />
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-3xl bg-white px-4 py-5 text-center"
      style={{ border: `5px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
    >
      <div className="font-display text-[22px] font-semibold tracking-[0.14em] opacity-60">{label}</div>
      <div className="mt-1 font-display text-[68px] font-bold leading-none">
        {value}
        {sub && <span className="ml-2 text-[26px] font-semibold opacity-50">{sub}</span>}
      </div>
    </div>
  );
}
