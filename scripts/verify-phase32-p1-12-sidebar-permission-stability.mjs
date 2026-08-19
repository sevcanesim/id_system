import fs from 'node:fs';
const files = {
  panel: fs.readFileSync('app/kurumsal/panel/CorporatePanelClient.tsx','utf8'),
  sidebar: fs.readFileSync('app/components/ui/PanelSidebar.tsx','utf8'),
  nav: fs.readFileSync('app/kurumsal/panel/domain/navigation.ts','utf8'),
  css: fs.readFileSync('app/globals.css','utf8'),
};
const checks = [
  ['sidebar loading state', files.panel.includes('sidebarPermissionsLoading') && files.sidebar.includes('loading?: boolean')],
  ['central role visibility', files.panel.includes('corporateSidebarItems(org.role)')],
  ['no role-derived tabs before org resolution', files.panel.includes('const tabs') && files.panel.includes('? corporateSidebarItems(org.role)')],
  ['shared group metadata', files.panel.includes('CORPORATE_PANEL_TAB_META[key].group')],
  ['loading aria state', files.sidebar.includes('aria-busy="true"')],
  ['stable loading rows', files.css.includes('enterprise-nav-loading-row')],
  ['employee-only department manager policy', files.nav.includes('if (role === "DEPARTMENT_MANAGER") return ["employees"]')],
  ['employee role hidden', files.nav.includes('if (role === "EMPLOYEE") return []')],
];
let failed=0; for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
process.exit(failed?1:0);
