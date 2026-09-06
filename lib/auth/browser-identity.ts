export type BrowserIdentity = {
  user: { id: string; email: string | null };
  account: { type: string | null; testLoginScope: string | null };
};

export async function getBrowserIdentity(): Promise<BrowserIdentity | null> {
  try {
    const response = await fetch("/api/auth/session/identity", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "x-yenomi-session": "1" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as Partial<BrowserIdentity>;
    if (!payload.user || typeof payload.user.id !== "string") return null;
    return {
      user: { id: payload.user.id, email: typeof payload.user.email === "string" ? payload.user.email : null },
      account: {
        type: typeof payload.account?.type === "string" ? payload.account.type : null,
        testLoginScope: typeof payload.account?.testLoginScope === "string" ? payload.account.testLoginScope : null,
      },
    };
  } catch {
    return null;
  }
}
