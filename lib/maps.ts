export function toGoogleMapsUrl(value: string): string {
  const input = value.trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  if (/^(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[^/]+\/maps|google\.[^/]+\/maps)/i.test(input)) {
    return `https://${input}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input)}`;
}
