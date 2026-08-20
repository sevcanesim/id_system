import { describe, expect, it } from "vitest";
import { CORPORATE_SIDEBAR_CONFIG, INDIVIDUAL_SIDEBAR_CONFIG, filterSidebarByRole, groupSidebarItems } from "./sidebar-config";
import { corporatePanelNavItems, corporateSidebarItems } from "../../kurumsal/panel/domain/navigation";

describe("filterSidebarByRole", () => {
  it("keeps HR employees, cards, and analytics using the persisted HR role", () => {
    expect(filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, "HR").map((item) => item.key)).toEqual([
      "overview",
      "employees",
      "cards",
      "analytics",
    ]);
  });

  it("treats the HR_MANAGER UI alias the same as HR", () => {
    expect(filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, "HR_MANAGER").map((item) => item.key)).toEqual(
      filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, "HR").map((item) => item.key),
    );
  });

  it("hides licenses from HR", () => {
    expect(filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, "HR").map((item) => item.key)).not.toContain("licenses");
  });
});

describe("INDIVIDUAL_SIDEBAR_CONFIG", () => {
  it("keeps the Identity / Insights / Account hierarchy for the personal workspace", () => {
    expect(INDIVIDUAL_SIDEBAR_CONFIG.map((item) => [item.key, item.href, item.label, item.group])).toEqual([
      ["home", "/kartlarim", "Genel Bakış", "KİMLİK"],
      ["card", "/kartim", "Dijital Kart", "KİMLİK"],
      ["edit", "/olustur", "Kimlik Stüdyosu", "KİMLİK"],
      ["analytics", "/istatistikler", "İstatistikler", "İÇGÖRÜLER"],
      ["leads", "/leadler", "Network Mail", "İÇGÖRÜLER"],
      ["orders", "/siparislerim", "Siparişlerim", "HESAP"],
      ["subscription", "/yenile", "Hizmet", undefined],
      ["settings", "/ayarlar", "Ayarlar", undefined],
    ]);
  });
});

describe("corporateSidebarItems", () => {
  it("limits department managers to employees", () => {
    expect(corporateSidebarItems("DEPARTMENT_MANAGER").map((item) => item.key)).toEqual(["employees"]);
  });

  it("keeps HR off license, template, and settings surfaces", () => {
    expect(corporateSidebarItems("HR").map((item) => item.key)).toEqual([
      "overview",
      "employees",
      "cards",
      "analytics",
    ]);
  });

  it("keeps management destinations under YÖNETİM until networking starts", () => {
    const groups = Object.fromEntries(corporateSidebarItems("OWNER").map((item) => [item.key, item.group]));
    expect(groups.analytics).toBe("YÖNETİM");
    expect(groups.licenses).toBe("YÖNETİM");
    expect(groups.organization).toBe("YÖNETİM");
    expect(groups.roles).toBe("YÖNETİM");
    expect(groups.settings).toBe("YÖNETİM");
    expect(groups.leads).toBe("NETWORKING");
    expect(groups.events).toBe("NETWORKING");
    expect(groups.meetings).toBe("NETWORKING");
  });

  it("uses distinct icons for Kartlar, Görüşmeler, and Kartım", () => {
    const owner = Object.fromEntries(corporatePanelNavItems("OWNER").map((item) => [item.key, item.icon]));
    expect(owner.cards).toBe("id");
    expect(owner.meetings).toBe("headset");
    expect(owner.kartim).toBe("contact");
    expect(new Set([owner.cards, owner.meetings, owner.kartim]).size).toBe(3);
  });
});

describe("corporatePanelNavItems", () => {
  it("appends Kartım under KİŞİSEL without changing management keys", () => {
    expect(corporatePanelNavItems("DEPARTMENT_MANAGER").map((item) => item.key)).toEqual(["employees", "kartim"]);
    expect(corporatePanelNavItems("HR").map((item) => [item.key, item.group]).at(-1)).toEqual(["kartim", "KİŞİSEL"]);
  });
});

describe("groupSidebarItems", () => {
  it("collapses consecutive items into named sections and keeps ungrouped items visible", () => {
    expect(groupSidebarItems([
      { key: "a", group: "GENEL" },
      { key: "b", group: "GENEL" },
      { key: "c", group: "YÖNETİM" },
      { key: "d" },
    ]).map((group) => [group.name, group.items.map((item) => item.key)])).toEqual([
      ["GENEL", ["a", "b"]],
      ["YÖNETİM", ["c"]],
      ["", ["d"]],
    ]);
  });
});
