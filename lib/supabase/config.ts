const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const rawKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

function isRealValue(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  const upper = normalized.toUpperCase();
  return !(
    upper.includes("YOUR_PROJECT") ||
    upper.includes("YOUR_PUBLISHABLE") ||
    upper.includes("BURAYA") ||
    upper.includes("PROJE-ID") ||
    upper.includes("XXXXXXXX")
  );
}

export const supabaseUrl = rawUrl.trim();
export const supabaseAnonKey = rawKey.trim();
export const hasSupabaseUrl = isRealValue(supabaseUrl);
export const hasSupabaseKey = isRealValue(supabaseAnonKey);
export const isSupabaseConfigured = hasSupabaseUrl && hasSupabaseKey;
export const supabaseConfigIssue = !hasSupabaseUrl
  ? "NEXT_PUBLIC_SUPABASE_URL eksik veya örnek değer olarak kalmış."
  : !hasSupabaseKey
    ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veya eski adla NEXT_PUBLIC_SUPABASE_ANON_KEY) eksik veya örnek değer olarak kalmış."
    : "";
