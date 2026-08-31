import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  individual: "app/components/IndividualSidebar.tsx",
  corporate: "app/kurumsal/panel/IDSidebar.tsx",
  shell: "app/components/ui/UnifiedSidebar.tsx",
  nav: "app/components/ui/SidebarNav.tsx",
  footer: "app/components/ui/SidebarAccountFooter.tsx",
  state: "app/components/ui/sidebar-state.ts",
  types: "app/components/ui/sidebar.types.ts",
  css: "app/styles/unified-sidebar.css",
};

const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = (message) => {
  console.error(`FAIL — ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

const contents = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

for (const [key, source] of Object.entries(contents)) {
  expect(!source.includes("<<<<<<<") && !source.includes("=======") && !source.includes(">>>>>>>"), `${files[key]} contains merge conflict markers`);
}

expect(contents.individual.includes("UnifiedSidebar"), "IndividualSidebar must use UnifiedSidebar");
expect(contents.corporate.includes("UnifiedSidebar"), "IDSidebar must use UnifiedSidebar");
expect(contents.individual.includes("SidebarAccountFooter"), "IndividualSidebar must use SidebarAccountFooter");
expect(contents.corporate.includes("SidebarAccountFooter"), "IDSidebar must use SidebarAccountFooter");
expect(!contents.individual.includes("<aside"), "IndividualSidebar must not duplicate sidebar shell markup");
expect(!contents.corporate.includes("<aside"), "IDSidebar must not duplicate sidebar shell markup");

expect(contents.types.includes('"visible" | "disabled" | "hidden"'), "Sidebar availability must expose visible/disabled/hidden");
expect(contents.nav.includes('aria-current={isCurrent ? "page" : undefined}'), "Current route must expose aria-current=page");
expect(contents.nav.includes('aria-disabled={disabled || undefined}'), "Disabled items must expose aria-disabled");
expect(contents.nav.includes("event.preventDefault()"), "Disabled items must prevent navigation");
expect(contents.nav.includes('!== "hidden"'), "Hidden items must be removed before rendering");

expect(contents.footer.includes("Destek"), "Shared footer must include Destek");
expect(contents.footer.includes("Yenomilabs"), "Shared footer must include Yenomilabs");
expect(contents.footer.includes('rel="noopener noreferrer"'), "External Yenomilabs link must be hardened");
expect(contents.footer.includes('type="button"'), "Logout must remain a button");

expect(contents.shell.includes('event.key === "Escape"'), "Mobile drawer must close with Escape");
expect(contents.shell.includes("previouslyFocused.current?.focus()"), "Drawer must restore prior focus");
expect(contents.shell.includes('document.body.style.overflow = "hidden"'), "Open drawer must lock body scrolling");

expect(contents.css.includes("flex-direction: column"), "Sidebar shell must be a column flex layout");
expect(contents.css.includes("overflow-y: auto"), "Sidebar nav must own vertical scrolling");
expect(contents.css.includes("flex: 0 0 auto"), "Sidebar footer region must remain outside nav scrolling");

if (!process.exitCode) console.log("PASS — unified sidebar architecture contracts verified");
