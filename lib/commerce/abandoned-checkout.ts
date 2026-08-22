export type AbandonedWave = "first" | "day";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function classifyAbandonedWave(input: {
  createdAt: string;
  now?: number;
  hasRecentPendingAttempt: boolean;
  sentFirst: boolean;
  sentDay: boolean;
}): AbandonedWave | null {
  if (input.hasRecentPendingAttempt) return null;
  const created = new Date(input.createdAt).getTime();
  if (!Number.isFinite(created)) return null;
  const age = (input.now ?? Date.now()) - created;
  if (age < TWO_HOURS_MS || age > WEEK_MS) return null;
  if (age >= DAY_MS && !input.sentDay) return "day";
  if (!input.sentFirst) return "first";
  return null;
}

export function abandonedEventType(wave: AbandonedWave) {
  return wave === "day" ? "ABANDONED_CHECKOUT_24H" : "ABANDONED_CHECKOUT";
}
