import Link from "next/link";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import PaytrIframe from "./PaytrIframe";
import { openPaytrPresentationToken, readPaytrPresentationSecret } from "../../../lib/payments/paytr-presentation";
import { getSupabaseAdminClient } from "../../../lib/supabase/server-admin";

export const dynamic = "force-dynamic";

type PaytrCheckoutPageProps = {
  searchParams: Promise<{ attempt?: string | string[] }>;
};

const ATTEMPT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function checkoutToken(value: string | string[] | undefined) {
  const attemptId = Array.isArray(value) ? value[0] : value;
  if (typeof attemptId !== "string" || !ATTEMPT_ID_RE.test(attemptId)) return null;
  const secret = readPaytrPresentationSecret({ cookies: await cookies() }, attemptId);
  if (!secret) return null;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("commerce_payment_attempts")
    .select("status,payment_token_ciphertext,payment_token_expires_at,payment_presentation_secret_hash")
    .eq("id", attemptId)
    .eq("provider", "PAYTR")
    .maybeSingle();
  if (!data || data.status !== "PENDING" || !data.payment_token_ciphertext || !data.payment_presentation_secret_hash || data.payment_presentation_secret_hash !== createHash("sha256").update(secret).digest("hex")) return null;
  if (!data.payment_token_expires_at || new Date(data.payment_token_expires_at).getTime() <= Date.now()) return null;
  return openPaytrPresentationToken(data.payment_token_ciphertext);
}

export default async function PaytrCheckoutPage({ searchParams }: PaytrCheckoutPageProps) {
  const token = await checkoutToken((await searchParams).attempt);
  if (!token) {
    return (
      <main id="main-content" className="checkout-page p5-checkout-page yi-footer-compact">
        <section className="paytr-checkout-shell">
          <div className="paytr-checkout-card paytr-checkout-card--invalid transaction-state-card">
            <p className="paytr-checkout-kicker">GÜVENLİ ÖDEME</p>
            <h1>Güvenli ödeme bağlantın artık geçerli değil.</h1>
            <p>Bu ödeme oturumu süresi dolmuş ya da tamamlanmış olabilir. Sipariş özetinden yeni bir güvenli ödeme adımı başlatabilirsin.</p>
            <Link className="yi-btn yi-btn--primary" href="/checkout">Sipariş özetine dön</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="checkout-page p5-checkout-page yi-footer-compact">
      <section className="paytr-checkout-shell">
        <header className="paytr-checkout-heading">
          <p className="paytr-checkout-kicker">GÜVENLİ ÖDEME</p>
          <h1>Ödemeni güvenle tamamla.</h1>
          <p>Kart bilgilerin PayTR’ın güvenli ödeme sayfasında işlenir; Yenomi kart bilgilerini saklamaz.</p>
        </header>
        <div className="paytr-checkout-card">
          <PaytrIframe token={token} />
        </div>
        <p className="paytr-checkout-footnote">Siparişin, PayTR’ın güvenli ödeme onayı geldikten sonra işleme alınır.</p>
      </section>
    </main>
  );
}
