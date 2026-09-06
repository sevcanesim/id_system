import { beforeEach, describe, expect, it, vi } from "vitest";

const getBrowserIdentity = vi.hoisted(() => vi.fn());

vi.mock("./browser-identity", () => ({ getBrowserIdentity }));

import {
  ACCOUNT_ROUTE_INDIVIDUAL,
  ACCOUNT_ROUTE_LOGIN,
  ACCOUNT_ROUTE_SERVER,
  resolveAccountDestination,
  resolveLoginDestination,
} from "./account-router";

describe("account router", () => {
  beforeEach(() => {
    getBrowserIdentity.mockReset();
  });

  it("sends an unauthenticated visitor to sign in", async () => {
    getBrowserIdentity.mockResolvedValue(null);

    await expect(resolveAccountDestination()).resolves.toBe(ACCOUNT_ROUTE_LOGIN);
  });

  it("opens the individual workspace for an individual account", async () => {
    getBrowserIdentity.mockResolvedValue({ account: { type: "INDIVIDUAL" } });

    await expect(resolveAccountDestination()).resolves.toBe(ACCOUNT_ROUTE_INDIVIDUAL);
  });

  it("delegates non-individual workspaces to the server router", async () => {
    getBrowserIdentity.mockResolvedValue({ account: { type: "CORPORATE_OWNER" } });

    await expect(resolveAccountDestination()).resolves.toBe(ACCOUNT_ROUTE_SERVER);
  });

  it("preserves an explicit non-workspace return path", async () => {
    await expect(resolveLoginDestination("business", "/kurumsal/davet?token=invite-token")).resolves.toBe("/kurumsal/davet?token=invite-token");
  });
});
