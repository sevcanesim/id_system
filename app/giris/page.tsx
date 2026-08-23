import LoginClient from "./LoginClient";
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
  const params = await searchParams;
  const portal = parseLoginPortal(firstSearchParam(params.portal));
  const initialNext = resolveLoginReturnPath(portal, firstSearchParam(params.next));
  const initialMode = parseLoginMode(firstSearchParam(params.mode));
  const initialMessage = loginErrorMessage(firstSearchParam(params.error));

  return (
    <LoginClient
      initialPortal={portal}
      initialNext={initialNext}
      initialMode={initialMode}
      initialMessage={initialMessage}
    />
  );
}
