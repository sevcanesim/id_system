import type { CorporatePanelTab } from "./navigation";

export type CorporatePanelDataResource =
  | "members"
  | "templates"
  | "physicalCards"
  | "memberCardStatuses"
  | "analytics"
  | "jobTitles"
  | "titleRequests"
  | "corporateLinks";

const TAB_DATA_RESOURCES: Record<CorporatePanelTab, readonly CorporatePanelDataResource[]> = {
  overview: ["members", "physicalCards", "memberCardStatuses", "templates", "analytics"],
  employees: ["members", "physicalCards", "memberCardStatuses", "jobTitles", "titleRequests"],
  cards: ["members", "physicalCards", "memberCardStatuses"],
  roles: ["members"],
  templates: ["members", "templates", "corporateLinks"],
  content: ["corporateLinks"],
  audit: [],
  analytics: ["analytics"],
  organization: ["members", "templates", "jobTitles", "titleRequests"],
  settings: [],
  leads: ["members", "memberCardStatuses"],
  events: ["members", "memberCardStatuses"],
  meetings: ["members", "memberCardStatuses"],
};

export function corporatePanelDataResources(tab: CorporatePanelTab) {
  return TAB_DATA_RESOURCES[tab];
}
