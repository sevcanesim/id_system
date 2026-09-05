import Link from "next/link";
import PaytrIframe from "./PaytrIframe";

type PaytrCheckoutPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

function checkoutToken(value: string | string[] | undefined) {
  const token = Array.isArray(value) ? value[0] : value;
  return typeof token === "string" && /^[A-Za-z0-9_-]{8,255}$/.test(token) ? token : null;
}

export default async function PaytrCheckoutPage({ searchParams }: PaytrCheckoutPageProps) {
  const token = checkoutToken((await searchParams).token);
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
