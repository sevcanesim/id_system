import { beforeEach, describe, expect, it, vi } from "vitest";

const stateHarness = vi.hoisted(() => {
  let values: unknown[] = [];
  let cursor = 0;

  return {
    reset() {
      values = [];
      cursor = 0;
    },
    render<T>(factory: () => T): T {
      cursor = 0;
      return factory();
    },
    useState<T>(initial: T | (() => T)) {
      const index = cursor++;
      if (!(index in values)) {
        values[index] = typeof initial === "function" ? (initial as () => T)() : initial;
      }
      const setValue = (next: T | ((current: T) => T)) => {
        const current = values[index] as T;
        values[index] = typeof next === "function"
          ? (next as (current: T) => T)(current)
          : next;
      };
      return [values[index] as T, setValue] as const;
    },
  };
});

vi.mock("react", () => ({ useState: stateHarness.useState }));

import { useJobTitlesAndRequests } from "./useJobTitlesAndRequests";

function jsonResponse(ok: boolean, data: unknown) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

describe("useJobTitlesAndRequests", () => {
  const token = vi.fn<() => Promise<string | null>>();
  const setMessage = vi.fn<(message: string) => void>();

  beforeEach(() => {
    stateHarness.reset();
    token.mockReset();
    token.mockResolvedValue("token");
    setMessage.mockReset();
    vi.restoreAllMocks();
  });

  function render(selected = "org-1") {
    return stateHarness.render(() => useJobTitlesAndRequests(selected, token, setMessage));
  }

  const formEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

  it("guards add when title is too short", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let hook = render();
    hook.setNewJobTitle("A");
    hook = render();

    await hook.addJobTitle(formEvent);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("adds a title and clears the input", async () => {
    let hook = render();
    hook.setNewJobTitle("Mühendis");
    hook = render();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(true, { title: { id: "1", title: "Mühendis" } }));

    await hook.addJobTitle(formEvent);

    const next = render();
    expect(next.jobTitles).toEqual([{ id: "1", title: "Mühendis" }]);
    expect(next.newJobTitle).toBe("");
    expect(next.jobTitleBusy).toBe(false);
  });

  it("surfaces a server error while adding", async () => {
    let hook = render();
    hook.setNewJobTitle("Mühendis");
    hook = render();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(false, { error: "Yetkisiz" }));

    await hook.addJobTitle(formEvent);

    expect(setMessage).toHaveBeenCalledWith("Yetkisiz");
    expect(render().jobTitleBusy).toBe(false);
  });

  it("recovers busy state when add fetch rejects", async () => {
    let hook = render();
    hook.setNewJobTitle("Mühendis");
    hook = render();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await hook.addJobTitle(formEvent);

    expect(setMessage).toHaveBeenCalledWith("Pozisyon eklenemedi.");
    expect(render().jobTitleBusy).toBe(false);
  });

  it("removes a title on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(true, {}));

    await render().removeJobTitle("title-1");

    expect(render().jobTitleBusy).toBe(false);
  });

  it("surfaces a server error while removing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(false, { error: "Kullanımda" }));

    await render().removeJobTitle("title-1");

    expect(setMessage).toHaveBeenCalledWith("Kullanımda");
    expect(render().jobTitleBusy).toBe(false);
  });

  it("recovers busy state when remove fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await render().removeJobTitle("title-1");

    expect(setMessage).toHaveBeenCalledWith("Pozisyon kaldırılamadı.");
    expect(render().jobTitleBusy).toBe(false);
  });

  it("resolves a title request", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(true, {}))
      .mockResolvedValueOnce(jsonResponse(true, { titles: [] }));

    await render().resolveTitleRequest("request-1", true);

    expect(render().titleRequestBusyId).toBeNull();
  });

  it("surfaces a server error while resolving a request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(false, { error: "Yetkisiz" }));

    await render().resolveTitleRequest("request-1", false);

    expect(setMessage).toHaveBeenCalledWith("Yetkisiz");
    expect(render().titleRequestBusyId).toBeNull();
  });

  it("recovers busy state when request fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await render().resolveTitleRequest("request-1", false);

    expect(setMessage).toHaveBeenCalledWith("Talep işlenemedi.");
    expect(render().titleRequestBusyId).toBeNull();
  });

  it("does not fetch job titles without a bearer", async () => {
    token.mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await render().loadJobTitles("org-1");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("loads title requests with an explicit bearer", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(true, { requests: [{ id: "r1" }] }));

    await render().loadTitleRequests("org-1", "explicit-token");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/organizations/title-requests?organizationId=org-1",
      { headers: { authorization: "Bearer explicit-token" } },
    );
    expect(render().titleRequests).toEqual([{ id: "r1" }]);
  });

  it("passes a null token through on add without crashing", async () => {
    token.mockResolvedValue(null);
    let hook = render();
    hook.setNewJobTitle("Mühendis");
    hook = render();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(false, { error: "Unauthorized" }));

    await hook.addJobTitle(formEvent);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/organizations/job-titles",
      expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer null" }) }),
    );
    expect(setMessage).toHaveBeenCalledWith("Unauthorized");
    expect(render().jobTitleBusy).toBe(false);
  });
});
