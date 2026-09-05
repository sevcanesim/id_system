"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cartItemPresentation, readCart, removeCartItem, setCartOwner, updateCartItemQuantity, writeCart, type CartItem } from "../../lib/cart";
import { COMMERCIAL_PRICING, isCorporatePackageSku, requiresPortalAccountSku } from "../../lib/config/commercial";
import { formatTryFromKurus } from "../../lib/config/product";
import { INDIVIDUAL_PLAN, INDIVIDUAL_PREMIUM_PLAN } from "../../lib/commerce/packages";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { EmptyState } from "../components/ui/States";
import { ButtonLink } from "../components/ui/DesignSystem";

type CartAudience = "guest" | "individual" | "corporate";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [audience, setAudience] = useState<CartAudience>("guest");
  useEffect(() => { const sync = () => setItems(readCart()); sync(); window.addEventListener("yenomi-cart-change", sync); return () => window.removeEventListener("yenomi-cart-change", sync); }, []);
  useEffect(() => {
    const supabase = getSupabaseBrowserClient(); if (!supabase) return;
    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token; const userId = data.session?.user.id;
      if (!token || !userId) { setAudience("guest"); return; }
      setCartOwner(userId, { claimGuest: true });
      const response = await fetch("/api/organizations/mine?management=true", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      if (response.ok) { const payload = await response.json() as { organizations?: unknown[] }; setAudience((payload.organizations ?? []).length ? "corporate" : "individual"); return; }
      setAudience("individual");
    });
  }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.unitPriceKurus * item.quantity, 0), [items]);
  const shippingIncluded = COMMERCIAL_PRICING.DOMESTIC_SHIPPING.includedForPhysicalProducts;
  const requiresPortalLogin = audience === "guest" && items.some((item) => requiresPortalAccountSku(item.variantSku));
  const portalLoginHref = `/giris?portal=${items.some((item) => isCorporatePackageSku(item.variantSku)) ? "business" : "individual"}&purchase=portal&next=%2Fcheckout`;
  const checkoutHref = requiresPortalLogin ? portalLoginHref : "/checkout";
  const update = (id: string, quantity: number) => { const next = updateCartItemQuantity(items, id, quantity); writeCart(next); setItems(next); };
  const remove = (id: string) => { const next = removeCartItem(items, id); writeCart(next); setItems(next); };

  return (
    <div className="yi-site">
      <main id="main-content" className={`cart-page p5-cart-page yi-section yi-section--light yi-cart-page yi-footer-compact${!items.length ? " cart-page--empty" : ""}`}>
        <div className="yi-container">
          <div className="yi-page-head">
            <span>SEPET</span>
            <h1>{items.length ? "Seçimin hazır. Son kez gözden geçir." : "Sepetin şu anda boş."}</h1>
            <p>{items.length ? requiresPortalLogin ? "Bu paket portal erişimi içerir. Ödemeden önce giriş yaparak paketi hesabına bağla." : "Hesap açmadan ilerleyebilirsin. Fiyat ödeme adımında sunucuda doğrulanır; kart numaran Yenomi’de saklanmaz." : "Güncel kartvizit paylaşımı için Bireysel NFC; bağlantı ve takip için Bireysel Premium’u incele."}</p>
          </div>
          {!items.length ? (
            <EmptyState
              icon="cart"
              title={`Bireysel Premium · ${formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus)}`}
              description={audience === "corporate" ? "NFC + QR kart, kişi yönetimi, toplantı ve sunum araçları, 100 Network Mail ve ilk yıl Premium erişimi dahil. Ek kurumsal kart kapasitesini Kartlar alanından yönetebilirsin." : "NFC + QR kart, kişi yönetimi, toplantı ve sunum araçları, 100 Network Mail ve ilk yıl Premium erişimi dahil."}
              action={<div className="ds-empty-actions"><Link className="ds-button ds-button--primary" href="/urunler/nfc-kart?paket=premium">Bireysel Premium’u Seç</Link>{audience === "corporate" ? <Link className="home-mockup__link-secondary" href="/kurumsal/panel/kartlar">Kurumsal kartları yönet</Link> : <><Link className="home-mockup__link-secondary" href="/urunler/nfc-kart?paket=individual">Bireysel NFC · {formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus)}</Link><Link className="home-mockup__link-secondary" href="/kurumsal">Kurumsal çözümleri incele</Link></>}</div>}
            />
          ) : (
            <div className="yi-cart-layout">
              <section className="yi-cart-items">
                {items.map((item) => {
                  const presentation = cartItemPresentation(item);
                  return <article className="yi-cart-item" key={item.cartItemId}><div><span>{presentation.eyebrow}</span>{presentation.lines.length > 1 ? <div className="yi-cart-item-title"><b>{presentation.lines[0]}</b><em>+ {presentation.lines[1]}</em></div> : <h2>{presentation.title}</h2>}<p>{formatTryFromKurus(item.unitPriceKurus)} / adet</p></div><div className="yi-cart-item__controls"><div className="yi-stepper"><button type="button" aria-label="Adedi azalt" disabled={item.quantity <= 1} onClick={() => update(item.cartItemId, Math.max(1, item.quantity - 1))}>−</button><span aria-live="polite">{item.quantity}</span><button type="button" aria-label="Adedi artır" disabled={isCorporatePackageSku(item.variantSku)} onClick={() => update(item.cartItemId, item.quantity + 1)}>+</button></div><strong>{formatTryFromKurus(item.unitPriceKurus * item.quantity)}</strong><button className="yi-remove" type="button" onClick={() => remove(item.cartItemId)}>Kaldır</button></div></article>;
                })}
              </section>
              <aside className="yi-cart-summary">
                <span>SİPARİŞ ÖZETİ</span>
                <div className="yi-cart-summary-rows"><div><span>Ürün toplamı</span><b>{formatTryFromKurus(total)}</b></div><div><span>Kargo</span><b>{shippingIncluded ? "Ücretsiz" : formatTryFromKurus(COMMERCIAL_PRICING.DOMESTIC_SHIPPING.priceKurus)}</b></div><div><span>Vergi</span><b>KDV dahil</b></div><div className="total"><span>Toplam</span><b>{formatTryFromKurus(total)}</b></div></div>
                {requiresPortalLogin ? <p className="yi-cart-account-prompt">Ödemeye geçtiğinde önce hesabına giriş yapman istenir. Girişten sonra sepetin korunur ve ödeme adımına dönersin.</p> : audience === "guest" ? <p className="yi-cart-account-prompt">Hesabın var mı? <Link href="/giris?next=%2Fcheckout">Giriş yap</Link> <span>— siparişini hesabına bağlayalım.</span></p> : null}
                <p>{requiresPortalLogin ? "Portal erişimi satın alma hesabına tanımlanır." : "Hesap açmadan ilerleyebilirsin. Siparişin e-posta adresinle otomatik eşleşir."}</p>
                <ButtonLink href={checkoutHref} variant="primary">Güvenli ödemeye geç</ButtonLink>
                <ButtonLink href="/urunler/nfc-kart?paket=premium" variant="ghost">Paketleri yeniden gör</ButtonLink>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
