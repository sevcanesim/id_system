export function transientTokenUrl(origin: string, pathname: string, token: string) {
  const url = new URL(pathname, origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
