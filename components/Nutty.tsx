// Plain <img> on purpose: static export has no image optimizer, and html-to-image needs real <img> tags.

export type Pose =
  | "idle"
  | "wave"
  | "flex"
  | "celebrate"
  | "trophy"
  | "on-fire"
  | "meditate"
  | "nervous"
  | "fallen";

const ALT: Record<Pose, string> = {
  idle: "Nutty the peanut, standing ready",
  wave: "Nutty the peanut, waving",
  flex: "Nutty the peanut, flexing",
  celebrate: "Nutty the peanut, jumping for joy",
  trophy: "Nutty the peanut, holding up a trophy",
  "on-fire": "Nutty the peanut, fired up",
  meditate: "Nutty the peanut, meditating",
  nervous: "Nutty the peanut, sweating nervously",
  fallen: "Nutty the peanut, knocked out",
};

/** The mascot. Images live in public/nutty/. */
export function Nutty({ pose, size, className = "" }: { pose: Pose; size: number; className?: string }) {
  return (
    <img
      src={`/nutty/${pose}.png`}
      alt={ALT[pose]}
      width={size}
      height={size}
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}

/** Round avatar: a zoomed-in crop of Nutty's face for the chosen pose. */
export function NuttyAvatar({ pose, size, className = "" }: { pose: string; size: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full border-ink bg-shell ${className}`}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 24)) }}
    >
      <img
        src={`/nutty/${pose}.png`}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="h-full w-full select-none object-cover"
        style={{ transform: "scale(1.7)", transformOrigin: "50% 30%" }}
      />
    </span>
  );
}
