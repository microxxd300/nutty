"use client";

import { Nutty } from "./Nutty";
import { dangerButton, secondaryButton } from "./ui";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="sticker w-full max-w-sm bg-cream p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Nutty pose="nervous" size={120} className="mx-auto -mt-2" />
        <h2 id="confirm-title" className="mt-2 font-display text-2xl font-bold">
          {title}
        </h2>
        <p className="mt-2 text-ink/70">{body}</p>
        <div className="mt-6 space-y-3">
          <button onClick={onConfirm} disabled={busy} className={dangerButton}>
            {busy ? "Submitting…" : confirmLabel}
          </button>
          <button onClick={onCancel} disabled={busy} className={secondaryButton}>
            Never mind, I&apos;m still standing
          </button>
        </div>
      </div>
    </div>
  );
}
