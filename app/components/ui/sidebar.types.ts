export type SidebarScope = "individual" | "corporate";

export type SidebarAvailability = "visible" | "disabled" | "hidden";

export type SidebarSectionAvailabilityMap = Partial<Record<string, SidebarAvailability>>;
