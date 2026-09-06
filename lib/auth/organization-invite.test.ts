import { beforeEach, describe, expect, it, vi } from "vitest";

const getBrowserIdentity = vi.hoisted(() => vi.fn());

vi.mock("./browser-identity", () => ({ getBrowserIdentity }));

import { acceptOrganizationInvite } from "./organization-invite";

describe("organization invite acceptance", () => {
  beforeEach(() => {
    getBrowserIdentity.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("rejects a missing invite token before checking the session", async () => {
    await expect(acceptOrganizationInvite(null)).resolves.toEqual({
      status: "error",
      message: "Davet bağlantısı geçersiz.",
    });
    expect(getBrowserIdentity).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks an unauthenticated recipient to log in", async () => {
    getBrowserIdentity.mockResolvedValue(null);

    await expect(acceptOrganizationInvite("a".repeat(32))).resolves.toEqual({ status: "needs-login" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the HttpOnly session cookie instead of exposing a bearer token", async () => {
    getBrowserIdentity.mockResolvedValue({ user: { id: "member-1", email: "member@example.test" } });
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ organizationId: "organization-1" }), { status: 200 }));

    await expect(acceptOrganizationInvite("a".repeat(32))).resolves.toEqual({
      status: "accepted",
      organizationId: "organization-1",
    });
    expect(fetch).toHaveBeenCalledWith("/api/organizations/invite/accept", expect.objectContaining({
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
    }));
  });
});
