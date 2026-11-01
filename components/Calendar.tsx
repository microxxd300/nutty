import { TOTAL_DAYS, type ChallengeInfo, type Summary } from "@/lib/challenge";

export function Calendar({ info, summary }: { info: ChallengeInfo; summary: Summary }) {
  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1);

  function cellClass(day: number) {
    const status = summary.byDay.get(day);
    if (status === "ok") return "border-ink bg-peanut text-ink";
    if (status === "fell") return "border-ink bg-band text-white";
    const isPast = info.phase === "over" || day < info.day;
    const afterFall = summary.fellOnDay !== null && day > summary.fellOnDay;
    if (isPast && !afterFall) return "border-ink/30 bg-ink/10 text-ink/50"; // missed
    return "border-dashed border-ink/25 bg-white/50 text-ink/35"; // future / after the fall
  }

  return (
    <div>
      <div className="grid grid-cols-6 gap-2">
        {days.map((day) => (
          <div
            key={day}
            className={`flex aspect-square items-center justify-center rounded-xl border-2 font-display font-semibold ${cellClass(day)} ${
              info.phase === "live" && day === info.day ? "ring-[3px] ring-band ring-offset-2 ring-offset-cream" : ""
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink/70">
        <Legend className="border-ink bg-peanut" label="Stood strong" />
        <Legend className="border-ink bg-band" label="Fell" />
        <Legend className="border-ink/30 bg-ink/10" label="No check-in" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3.5 w-3.5 rounded border-2 ${className}`} />
      {label}
    </span>
  );
}
