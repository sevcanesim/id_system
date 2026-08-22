import { describe, expect, it } from "vitest";
import {
  isBulkInviteMailFailed,
  resolveBulkInviteDepartment,
  summarizeBulkInviteResults,
} from "./bulk-invite";

describe("resolveBulkInviteDepartment", () => {
  it("QA-ORG-01: pins a department manager to their own department and ignores CSV", () => {
    expect(resolveBulkInviteDepartment({
      actorRole: "DEPARTMENT_MANAGER",
      actorDepartment: "Satış",
      csvDepartment: "İK",
    })).toBe("Satış");
  });

  it("lets company-wide managers keep the CSV department", () => {
    expect(resolveBulkInviteDepartment({
      actorRole: "OWNER",
      actorDepartment: "Yönetim",
      csvDepartment: "İK",
    })).toBe("İK");
  });
});

describe("QA-BULK-EMAIL-01 mail failure classification", () => {
  it("keeps a created row with emailSent false out of the success bucket", () => {
    const results = [
      { status: "created" as const, emailSent: true },
      { status: "created" as const, emailSent: false },
      { status: "error" as const, error: "Lisans kotası doldu." },
    ];
    expect(isBulkInviteMailFailed(results[0])).toBe(false);
    expect(isBulkInviteMailFailed(results[1])).toBe(true);
    expect(isBulkInviteMailFailed(results[2])).toBe(false);
    expect(summarizeBulkInviteResults(results)).toEqual({
      created: 2,
      failed: 1,
      mailFailed: 1,
    });
  });
});
