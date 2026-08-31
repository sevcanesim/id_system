import Link from "next/link";
import { redirect } from "next/navigation";
import { ACCOUNT_ROUTE_LOGIN } from "../../lib/auth/account-router";
import { resolveServerAccountDestination } from "../../lib/auth/server-account-router";

export const dynamic = "force-dynamic";

export default async function AccountRouterPage() {
  const result = await resolveServerAccountDestination();

  if (result.ok) redirect(result.destination);
  if (result.reason === "SESSION_INVALID") redirect(ACCOUNT_ROUTE_LOGIN);

  return (
    <main className="account-loading" aria-labelledby="account-routing-title">
      <div role="alert">
        <h1 id="account-routing-title">Hesap alanı şu anda doğrulanamıyor.</h1>
        <p>
          Yetki bilgilerin değişmedi. Geçici bir bağlantı veya veri servisi hatası nedeniyle yanlış panele
          yönlendirmek yerine işlemi durdurduk.
        </p>
        <Link href="/hesabim">Tekrar dene</Link>
      </div>
    </main>
  );
}
