const INITIAL_PANEL_LOAD_TIMEOUT_MS = 12_000;
const PANEL_REQUEST_TIMEOUT_MS = 10_000;

export async function fetchWithPanelTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = PANEL_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const upstreamSignal = init.signal;

  if (upstreamSignal?.aborted) controller.abort(upstreamSignal.reason);
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}

export async function waitForInitialPanelLoads(loads: Promise<unknown>[]) {
  let timeoutId: number | undefined;

  const timeout = new Promise<"timeout">((resolve) => {
    timeoutId = window.setTimeout(() => resolve("timeout"), INITIAL_PANEL_LOAD_TIMEOUT_MS);
  });

  try {
    const outcome = await Promise.race([
      Promise.allSettled(loads).then(() => "settled" as const),
      timeout,
    ]);
    return { timedOut: outcome === "timeout" };
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}
