const INITIAL_PANEL_LOAD_TIMEOUT_MS = 12_000;
const PANEL_REQUEST_TIMEOUT_MS = 10_000;

export async function fetchWithPanelTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = PANEL_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function waitForInitialPanelLoads(loads: Promise<unknown>[]) {
  let timedOut = false;
  await Promise.race([
    Promise.allSettled(loads),
    new Promise<void>((resolve) =>
      window.setTimeout(() => {
        timedOut = true;
        resolve();
      }, INITIAL_PANEL_LOAD_TIMEOUT_MS),
    ),
  ]);
  return { timedOut };
}
