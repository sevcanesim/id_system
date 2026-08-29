import { headers } from "next/headers";
import LoginClient from "./LoginClient";
import "./login-experience.css";
import {
  firstSearchParam,
  loginErrorMessage,
  parseLoginMode,
  parseLoginPortal,
  resolveLoginReturnPath,
} from "../../lib/auth/login-search";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    portal?: string | string[];
    next?: string | string[];
    mode?: string | string[];
    error?: string | string[];
  }>;
}) {
  const headerList = await headers();
  const params = await searchParams;
  const portal = parseLoginPortal(headerList.get("x-login-portal") || firstSearchParam(params.portal));
  const initialNext = resolveLoginReturnPath(
    portal,
    headerList.get("x-login-next") || firstSearchParam(params.next),
  );
  const initialMode = parseLoginMode(headerList.get("x-login-mode") || firstSearchParam(params.mode));
  const initialMessage = loginErrorMessage(headerList.get("x-login-error") || firstSearchParam(params.error));

  return (
    <LoginClient
      initialPortal={portal}
      initialNext={initialNext}
      initialMode={initialMode}
      initialMessage={initialMessage}
    />
  );
}
