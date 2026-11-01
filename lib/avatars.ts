// Nutty poses a player can pick as their avatar.
// Must match the CHECK constraint on profiles.avatar in supabase/setup.sql.
export const AVATARS = ["idle", "wave", "flex", "celebrate", "on-fire", "meditate", "nervous"] as const;

export type Avatar = (typeof AVATARS)[number];
