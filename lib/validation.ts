// Mirrors the CHECK constraints in supabase/setup.sql.
const ALLOWED = /^[A-Za-z0-9_ ]+$/;

/** Returns an error message, or null if the (trimmed) name is valid. */
export function nameError(value: string, label: string, max: number): string | null {
  const v = value.trim();
  if (v.length < 2 || v.length > max) return `${label} must be 2–${max} characters.`;
  if (!ALLOWED.test(v)) return `${label} can only use letters, numbers, spaces and underscores.`;
  return null;
}

export const DISPLAY_NAME_MAX = 20;
export const GROUP_NAME_MAX = 30;
