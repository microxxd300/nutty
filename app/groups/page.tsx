"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Nutty } from "@/components/Nutty";
import { Protected } from "@/components/Protected";
import { ErrorText, inputClass, primaryButton, secondaryButton, SpeechBubble, Spinner } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { GROUP_NAME_MAX, nameError } from "@/lib/validation";

type GroupRow = {
  id: string;
  name: string;
  invite_code: string;
  group_members: { count: number }[];
};

export default function GroupsPage() {
  return (
    <Protected>
      <GroupsScreen />
    </Protected>
  );
}

function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // RLS only returns groups you're a member of.
    supabase
      .from("groups")
      .select("id,name,invite_code,group_members(count)")
      .order("created_at")
      .then(({ data, error }) => {
        if (error) setLoadError(error.message);
        else setGroups(data as GroupRow[]);
      });
  }, []);

  const openGroup = (id: string) => router.push(`/groups/view?id=${id}`);

  return (
    <>
      <h1 className="font-display text-4xl font-bold">Groups</h1>
      <p className="mt-1 text-ink/70">Accountability hits different with an audience.</p>

      <section className="mt-6 space-y-4">
        {loadError && <ErrorText>{loadError}</ErrorText>}
        {!groups && !loadError && <Spinner />}
        {groups?.length === 0 && (
          <div className="flex items-center gap-3">
            <Nutty pose="wave" size={100} className="shrink-0" />
            <div className="pl-2">
              <SpeechBubble>No squad yet. Start one or join with a code below.</SpeechBubble>
            </div>
          </div>
        )}
        {groups?.map((g) => (
          <Link key={g.id} href={`/groups/view?id=${g.id}`} className="sticker flex items-center justify-between bg-white p-4">
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold">{g.name}</span>
              <span className="block text-sm text-ink/60">
                {g.group_members[0]?.count ?? 0} members · code{" "}
                <span className="font-mono font-bold text-ink">{g.invite_code}</span>
              </span>
            </span>
            <span className="font-display text-2xl font-bold" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        ))}
      </section>

      <JoinForm onJoined={openGroup} />
      <CreateForm onCreated={openGroup} />
    </>
  );
}

function JoinForm({ onJoined }: { onJoined: (id: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(clean)) return setError("Invite codes are 8 letters/numbers.");
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("join_group", { code: clean });
    setBusy(false);
    if (error) setError(error.message);
    else onJoined(data as string);
  }

  return (
    <form onSubmit={submit} className="mt-10">
      <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-widest text-ink/60">Join with a code</h2>
      <div className="flex gap-3">
        <input
          className={`${inputClass} font-mono uppercase tracking-[0.3em]`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
          placeholder="ABCD2345"
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Invite code"
        />
        <button type="submit" disabled={busy} className={`${secondaryButton} w-auto shrink-0 px-5`}>
          {busy ? "…" : "Join"}
        </button>
      </div>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}

function CreateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    const invalid = nameError(clean, "Group name", GROUP_NAME_MAX);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("create_group", { group_name: clean });
    setBusy(false);
    if (error) setError(error.message);
    else onCreated(data as string);
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-widest text-ink/60">Start a group</h2>
      <input
        className={inputClass}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={GROUP_NAME_MAX}
        placeholder="e.g. Gym Bros 2026"
        aria-label="Group name"
      />
      <ErrorText>{error}</ErrorText>
      <button type="submit" disabled={busy} className={`${primaryButton} mt-4`}>
        {busy ? "Creating…" : "Create group"}
      </button>
      <p className="mt-3 text-xs text-ink/60">You can create up to 5 groups. Up to 50 people per group.</p>
    </form>
  );
}
