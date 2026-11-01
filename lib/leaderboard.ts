import { supabase } from "./supabase";
import { dateOfDay, summarize, TOTAL_DAYS, type ChallengeInfo, type Checkin, type Summary } from "./challenge";

export type Group = { id: string; name: string; invite_code: string; created_by: string };

export type Member = {
  user_id: string;
  joined_at: string;
  display_name: string;
  avatar: string;
};

export type Entry = Member & { summary: Summary; rank: number };

type MemberRow = {
  user_id: string;
  joined_at: string;
  profiles: { display_name: string; avatar: string } | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** All November check-ins for these users. Paged, because 50 members × 30 days > 1000 rows. */
export async function fetchCheckins(userIds: string[], year: number): Promise<Checkin[]> {
  const PAGE = 1000;
  const all: Checkin[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("checkins")
      .select("user_id,date,status")
      .in("user_id", userIds)
      .gte("date", dateOfDay(year, 1))
      .lte("date", dateOfDay(year, TOTAL_DAYS))
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as Checkin[]));
    if (data.length < PAGE) return all;
  }
}

/** Active first, then longest streak, then whoever joined the group first. */
export function rankMembers(members: Member[], checkins: Checkin[], info: ChallengeInfo): Entry[] {
  const byUser = new Map<string, Checkin[]>();
  for (const c of checkins) {
    const list = byUser.get(c.user_id) ?? [];
    list.push(c);
    byUser.set(c.user_id, list);
  }

  return members
    .map((m) => ({ ...m, summary: summarize(byUser.get(m.user_id) ?? [], info) }))
    .sort(
      (a, b) =>
        Number(b.summary.isActive) - Number(a.summary.isActive) ||
        b.summary.streak - a.summary.streak ||
        Date.parse(a.joined_at) - Date.parse(b.joined_at),
    )
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** Returns null if the group doesn't exist or you're not in it (RLS hides it). */
export async function loadLeaderboard(
  groupId: string,
  info: ChallengeInfo,
): Promise<{ group: Group; entries: Entry[] } | null> {
  if (!UUID.test(groupId)) return null;

  const [groupRes, membersRes] = await Promise.all([
    supabase.from("groups").select("id,name,invite_code,created_by").eq("id", groupId).maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id,joined_at,profiles(display_name,avatar)")
      .eq("group_id", groupId),
  ]);
  if (groupRes.error) throw groupRes.error;
  if (membersRes.error) throw membersRes.error;
  if (!groupRes.data) return null;

  const members: Member[] = (membersRes.data as unknown as MemberRow[]).map((r) => ({
    user_id: r.user_id,
    joined_at: r.joined_at,
    display_name: r.profiles?.display_name ?? "Unknown",
    avatar: r.profiles?.avatar ?? "idle",
  }));

  const checkins = await fetchCheckins(
    members.map((m) => m.user_id),
    info.year,
  );

  return { group: groupRes.data as Group, entries: rankMembers(members, checkins, info) };
}
