import { Nutty } from "./Nutty";

export const inputClass =
  "w-full rounded-2xl border-[3px] border-ink bg-white px-4 py-3 text-base font-semibold text-ink placeholder:font-normal placeholder:text-ink/40 outline-none focus:border-band";

export const primaryButton = "btn bg-band text-white";

export const peanutButton = "btn bg-peanut text-ink";

export const dangerButton = "btn bg-white text-band";

export const secondaryButton = "btn bg-white text-ink";

export function Spinner() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
      <Nutty pose="idle" size={88} className="animate-bounce" />
      <p className="font-display text-sm font-semibold text-ink/60">Loading…</p>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-sm font-bold text-band">{children}</p>;
}

/** Comic speech bubble, pointing left at the mascot. */
export function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticker relative bg-white px-4 py-3 font-display text-lg font-semibold leading-snug">
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-[11px] h-4 w-4 -translate-y-1/2 rotate-45 border-b-[3px] border-l-[3px] border-ink bg-white"
      />
      {children}
    </div>
  );
}
