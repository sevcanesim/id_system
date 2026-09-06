import { getBrowserIdentity } from "./browser-identity";

export const ACCOUNT_ROUTE_LOGIN = "/giris?next=%2Fhesabim";
export const ACCOUNT_ROUTE_ADMIN = "/admin/operations";
export const ACCOUNT_ROUTE_CORPORATE = "/kurumsal/panel";
export const ACCOUNT_ROUTE_INDIVIDUAL = "/kartim";
export const ACCOUNT_ROUTE_EMPLOYEE = "/kartim";
export const ACCOUNT_ROUTE_SERVER = "/hesabim";

const DEFAULT_WORKSPACE_PATHS = new Set([
  ACCOUNT_ROUTE_CORPORATE,
  ACCOUNT_ROUTE_INDIVIDUAL,
  ACCOUNT_ROUTE_EMPLOYEE,
  ACCOUNT_ROUTE_SERVER,
  "/kartlarim",
]);

export async function resolveAccountDestination(): Promise<string> {
  const identity = await getBrowserIdentity();
  if (!identity) return ACCOUNT_ROUTE_LOGIN;
  if (identity.account.type === "INDIVIDUAL") return ACCOUNT_ROUTE_INDIVIDUAL;
  return ACCOUNT_ROUTE_SERVER;
}

export function isDefaultWorkspacePath(path: string) {
  return DEFAULT_WORKSPACE_PATHS.has(path);
}

export async function resolveLoginDestination(
  _portal: "individual" | "business",
  requestedPath: string,
): Promise<string> {
  if (!isDefaultWorkspacePath(requestedPath)) return requestedPath;
  return resolveAccountDestination();
}
