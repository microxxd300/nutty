export type Status = "ok" | "fell";
export type Checkin = { user_id: string; date: string; status: Status };

export const TOTAL_DAYS = 30;

export type Phase = "before" | "live" | "over";

export type ChallengeInfo = {
  year: number;
  phase: Phase;
  /** 0 before Nov 1, 1–30 during, 30 after. */
  day: number;
  /** YYYY-MM-DD in the user's timezone. */
  today: string;
  daysUntilStart: number;
};

/** Today's date as YYYY-MM-DD in an IANA timezone. */
export function todayIn(timeZone: string): string {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Same rules the server uses in check_in(): Nov 1–30 of the current year. */
export function getChallenge(timeZone: string): ChallengeInfo {
  const today = todayIn(timeZone);
  const [year, month, dayOfMonth] = today.split("-").map(Number);

  if (month < 11) {
    const ms = Date.UTC(year, 10, 1) - Date.UTC(year, month - 1, dayOfMonth);
    return { year, phase: "before", day: 0, today, daysUntilStart: Math.round(ms / 86_400_000) };
  }
  if (month === 11) return { year, phase: "live", day: dayOfMonth, today, daysUntilStart: 0 };
  return { year, phase: "over", day: TOTAL_DAYS, today, daysUntilStart: 0 };
}

export function dateOfDay(year: number, day: number): string {
  return `${year}-11-${String(day).padStart(2, "0")}`;
}

export type Summary = {
  byDay: Map<number, Status>;
  fellOnDay: number | null;
  isActive: boolean;
  /** Consecutive "ok" check-ins ending today/yesterday (or right before the fall). */
  streak: number;
  okCount: number;
  checkedInToday: boolean;
  daysSurvived: number;
};

export function summarize(checkins: Pick<Checkin, "date" | "status">[], info: ChallengeInfo): Summary {
  const byDay = new Map<number, Status>();
  for (const c of checkins) {
    if (c.date.startsWith(`${info.year}-11-`)) byDay.set(Number(c.date.slice(8, 10)), c.status);
  }

  let fellOnDay: number | null = null;
  let okCount = 0;
  for (const [day, status] of byDay) {
    if (status === "ok") okCount++;
    if (status === "fell" && (fellOnDay === null || day < fellOnDay)) fellOnDay = day;
  }

  // Where the streak is counted back from. Not checking in yet today
  // doesn't break your streak — the day isn't over.
  let cursor = 0;
  if (fellOnDay !== null) cursor = fellOnDay - 1;
  else if (info.phase === "over") cursor = TOTAL_DAYS;
  else if (info.phase === "live") cursor = byDay.get(info.day) === "ok" ? info.day : info.day - 1;

  let streak = 0;
  while (cursor >= 1 && byDay.get(cursor) === "ok") {
    streak++;
    cursor--;
  }

  const checkedInToday = info.phase === "live" && byDay.has(info.day);

  let daysSurvived = 0;
  if (fellOnDay !== null) daysSurvived = fellOnDay - 1;
  else if (info.phase === "over") daysSurvived = TOTAL_DAYS;
  else if (info.phase === "live") daysSurvived = checkedInToday ? info.day : info.day - 1;

  return {
    byDay,
    fellOnDay,
    isActive: fellOnDay === null,
    streak,
    okCount,
    checkedInToday,
    daysSurvived,
  };
}
