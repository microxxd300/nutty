"use client";

import { useState, type FormEvent } from "react";
import { AVATARS } from "@/lib/avatars";
import { deviceTimezone } from "@/lib/challenge";
import { supabase } from "@/lib/supabase";
import { DISPLAY_NAME_MAX, nameError } from "@/lib/validation";
import { useAuth, type Profile } from "./AuthProvider";
import { NuttyAvatar } from "./Nutty";
import { ErrorText, inputClass, primaryButton, secondaryButton } from "./ui";

/** Turns a Google profile name ("José Núñez-Li") into one our rules accept ("Jose NunezLi"). */
function suggestedName(metadata: Record<string, unknown> | undefined): string {
  const raw = String(metadata?.full_name ?? metadata?.name ?? "");
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^A-Za-z0-9_ ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DISPLAY_NAME_MAX)
    .trim();
}

export function ProfileForm({ existing, onDone }: { existing?: Profile; onDone?: () => void }) {
  const { session, refreshProfile } = useAuth();
  const [name, setName] = useState(existing?.display_name ?? suggestedName(session?.user.user_metadata));
  const [avatar, setAvatar] = useState(existing?.avatar ?? AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timezone = deviceTimezone();

  async function save(fields: { display_name: string; avatar: string; timezone: string }) {
    const userId = session!.user.id;
    return existing
      ? supabase.from("profiles").update(fields).eq("id", userId)
      : supabase.from("profiles").insert({ id: userId, ...fields });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    const invalid = nameError(clean, "Display name", DISPLAY_NAME_MAX);
    if (invalid) return setError(invalid);

    setSaving(true);
    setError(null);
    let { error } = await save({ display_name: clean, avatar, timezone });
    // Rare: the browser reports a timezone name Postgres doesn't know. Fall back to UTC.
    if (error?.message.includes("timezone")) {
      ({ error } = await save({ display_name: clean, avatar, timezone: "UTC" }));
    }
    setSaving(false);

    if (error) return setError(error.message);
    await refreshProfile();
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="display-name" className="mb-2 block font-display font-semibold">
          Display name
        </label>
        <input
          id="display-name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={DISPLAY_NAME_MAX}
          placeholder="e.g. Iron_Will"
          autoComplete="nickname"
        />
        <p className="mt-1 text-xs text-ink/60">2–20 characters. Letters, numbers, spaces, underscores.</p>
      </div>

      <div>
        <p className="mb-2 font-display font-semibold">Pick your Nutty</p>
        <div className="grid grid-cols-4 gap-3">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAvatar(a)}
              aria-label={`Avatar: Nutty ${a.replace("-", " ")}`}
              aria-pressed={avatar === a}
              className={`flex aspect-square items-center justify-center rounded-2xl border-[3px] transition ${
                avatar === a ? "border-ink bg-peanut shadow-[3px_3px_0_var(--color-ink)]" : "border-transparent bg-white/60"
              }`}
            >
              <NuttyAvatar pose={a} size={56} />
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink/60">
        Timezone: <span className="font-bold text-ink">{timezone}</span> (from this device — decides when your day
        rolls over)
      </p>

      <ErrorText>{error}</ErrorText>

      <div className="space-y-3">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "Saving…" : existing ? "Save profile" : "I'm in"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className={secondaryButton}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
