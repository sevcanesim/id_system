"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";
import { ButtonLink } from "./Button";
import { Icon } from "../icons";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { cartCount } from "../../lib/cart";

const links = [
  ["/urunler", "Dijital Kartvizit"],
  ["/nasil-calisir", "Nasıl Çalışır"],
  ["/kurumsal", "Kurumsal Çözümler"],
  ["/destek", "Yardım Merkezi"],
] as const;

export default function SiteHeader({
  theme = "light",
  actions = [],
  showDefaultCta = true,
}: {
  theme?: "dark" | "light";
  actions?: Array<{ href: string; label: string; primary?: boolean }>;
  showDefaultCta?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [count, setCount] = useState(0);
  const primaryCta = actions.filter((a) => a.primary).slice(0, 1)[0]
    ?? (showDefaultCta ? { href: "/urunler/nfc-kart", label: "NFC Kartı İncele", primary: true } : null);

  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (sb) void sb.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const sync = () => setCount(cartCount());
    sync();
    window.addEventListener("yenomi-cart-change", sync);
    return () => window.removeEventListener("yenomi-cart-change", sync);
  }, []);

  return (
    <header className={`yi-header yi-header--${theme}`}>
      <div className="yi-container yi-header__inner">
        <Brand />
        <nav className={`yi-nav${open ? " is-open" : ""}`} aria-label="Ana menü">
          {links.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          {primaryCta ? (
            <Link className="yi-nav__funnel yi-nav__funnel--primary" href={primaryCta.href} onClick={() => setOpen(false)}>
              {primaryCta.label}
            </Link>
          ) : null}
          <Link className="yi-nav__funnel" href={signedIn ? "/hesabim" : "/giris"} onClick={() => setOpen(false)}>
            {signedIn ? "Hesabım" : "Giriş Yap"}
          </Link>
        </nav>
        <div className="yi-header__actions">
          <Link className="yi-cart" href="/sepet" aria-label={count ? `Sepet, ${count} ürün` : "Sepet"}>
            <Icon name="cart" />
            <span>Sepet</span>
            {count > 0 && <b>{count}</b>}
          </Link>
          {primaryCta ? <ButtonLink href={primaryCta.href} variant="primary">{primaryCta.label}</ButtonLink> : null}
          <ButtonLink href={signedIn ? "/hesabim" : "/giris"} variant="secondary">{signedIn ? "Hesabım" : "Giriş Yap"}</ButtonLink>
          <button className="yi-menu" type="button" aria-label={open ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
