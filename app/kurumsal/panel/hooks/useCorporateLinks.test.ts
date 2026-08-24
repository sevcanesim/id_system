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
      if (!(index in values)) values[index] = typeof initial === "function" ? (initial as () => T)() : initial;
      const setValue = (next: T | ((current: T) => T)) => {
        const current = values[index] as T;
        values[index] = typeof next === "function" ? (next as (current: T) => T)(current) : next;
      };
      return [values[index] as T, setValue] as const;
    },
  };
});

vi.mock("react", () => ({ useState: stateHarness.useState }));

import { useCorporateLinks } from "./useCorporateLinks";

function jsonResponse(ok: boolean, data: unknown) {
  return { ok, json: vi.fn().mockResolvedValue(data) } as unknown as Response;
}

describe("useCorporateLinks", () => {
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
    return stateHarness.render(() => useCorporateLinks(selected, token, setMessage));
  }

  it("guards save when url is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await render().saveCorporateLinkUrl("KVKK");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("saves a url and clears the draft", async () => {
    let hook = render();
    hook.setLinkUrlDraft({ KVKK: "https://example.com/kvkk" });
    hook = render();
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(true, {}))
      .mockResolvedValueOnce(jsonResponse(true, { links: [], versions: [] }));
    await hook.saveCorporateLinkUrl("KVKK");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(render().linkUrlDraft.KVKK).toBe("");
    expect(render().linkBusyKind).toBeNull();
  });

  it("surfaces a server error while saving", async () => {
    let hook = render();
    hook.setLinkUrlDraft({ KVKK: "https://example.com/kvkk" });
    hook = render();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(false, { error: "Yetkisiz" }));
    await hook.saveCorporateLinkUrl("KVKK");
    expect(setMessage).toHaveBeenCalledWith("Yetkisiz");
    expect(render().linkBusyKind).toBeNull();
  });

  it("recovers busy state when save fetch rejects", async () => {
    let hook = render();
    hook.setLinkUrlDraft({ KVKK: "https://example.com/kvkk" });
    hook = render();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await hook.saveCorporateLinkUrl("KVKK");
    expect(setMessage).toHaveBeenCalledWith("Bağlantı kaydedilemedi.");
    expect(render().linkBusyKind).toBeNull();
  });

  it("rejects non-pdf uploads before network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await render().uploadCorporateLinkFile("CATALOG", { type: "image/png", size: 10 } as File);
    expect(setMessage).toHaveBeenCalledWith("Yalnızca PDF dosyası yüklenebilir.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects oversized pdf uploads before network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await render().uploadCorporateLinkFile("CATALOG", { type: "application/pdf", size: 20 * 1024 * 1024 + 1 } as File);
    expect(setMessage).toHaveBeenCalledWith("PDF en fazla 20 MB olabilir.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("recovers busy state when upload fetch rejects", async () => {
    vi.stubGlobal("FormData", class { append() {} });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await render().uploadCorporateLinkFile("CATALOG", { type: "application/pdf", size: 10 } as File);
    expect(setMessage).toHaveBeenCalledWith("PDF yüklenemedi.");
    expect(render().linkBusyKind).toBeNull();
  });

  it("removes a link on success", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(true, {}))
      .mockResolvedValueOnce(jsonResponse(true, { links: [], versions: [] }));
    await render().removeCorporateLink("KVKK");
    expect(setMessage).toHaveBeenCalledWith("Kurumsal bağlantı kaldırıldı.");
    expect(render().linkBusyKind).toBeNull();
  });

  it("surfaces a server error while removing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(false, { error: "Silinemez" }));
    await render().removeCorporateLink("KVKK");
    expect(setMessage).toHaveBeenCalledWith("Silinemez");
    expect(render().linkBusyKind).toBeNull();
  });

  it("recovers busy state when remove fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await render().removeCorporateLink("KVKK");
    expect(setMessage).toHaveBeenCalledWith("Bağlantı kaldırılamadı.");
    expect(render().linkBusyKind).toBeNull();
  });

  it("publishes a link on success", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(true, {}))
      .mockResolvedValueOnce(jsonResponse(true, { links: [], versions: [] }));
    await render().toggleCorporateLinkPublication("KVKK", true);
    expect(setMessage).toHaveBeenCalledWith("Kurumsal içerik yayınlandı.");
    expect(render().linkBusyKind).toBeNull();
  });

  it("surfaces a server error while publishing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(false, { error: "Yayınlanamaz" }));
    await render().toggleCorporateLinkPublication("KVKK", true);
    expect(setMessage).toHaveBeenCalledWith("Yayınlanamaz");
    expect(render().linkBusyKind).toBeNull();
  });

  it("recovers busy state when publication fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await render().toggleCorporateLinkPublication("KVKK", true);
    expect(setMessage).toHaveBeenCalledWith("Yayın durumu güncellenemedi.");
    expect(render().linkBusyKind).toBeNull();
  });

  it("rolls back a link version on success", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(true, {}))
      .mockResolvedValueOnce(jsonResponse(true, { links: [], versions: [] }));
    await render().rollbackCorporateLink("version-1", "KVKK");
    expect(setMessage).toHaveBeenCalledWith("Kurumsal içerik seçilen sürüme geri alındı.");
    expect(render().linkBusyKind).toBeNull();
  });

  it("recovers busy state when rollback fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await render().rollbackCorporateLink("version-1", "KVKK");
    expect(setMessage).toHaveBeenCalledWith("Sürüm geri alınamadı.");
    expect(render().linkBusyKind).toBeNull();
  });

  it("passes a null token through to the server without crashing", async () => {
    token.mockResolvedValue(null);
    let hook = render();
    hook.setLinkUrlDraft({ KVKK: "https://example.com/kvkk" });
    hook = render();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(false, { error: "Unauthorized" }));
    await hook.saveCorporateLinkUrl("KVKK");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/organizations/links",
      expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer null" }) }),
    );
    expect(setMessage).toHaveBeenCalledWith("Unauthorized");
    expect(render().linkBusyKind).toBeNull();
  });
});
