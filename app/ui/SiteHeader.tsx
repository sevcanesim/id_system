"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./Brand";
import { ButtonLink } from "./Button";
import { Icon } from "../icons";
import { getBrowserIdentity } from "../../lib/auth/browser-identity";
import { cartCount } from "../../lib/cart";

const links = [
  ["/urunler", "Dijital Kartvizit"],
  ["/nasil-calisir", "Nasıl Çalışır"],
  ["/kurumsal", "Kurumsal Çözümler"],
  ["/destek", "Yardım Merkezi"],
] as const;

export type HeaderVariant = "marketing" | "commerce" | "support-legal" | "auth" | "checkout";

export default function SiteHeader({
  variant = "marketing",
  actions = [],
  showDefaultCta = true,
}: {
  variant?: HeaderVariant;
  actions?: Array<{ href: string; label: string; primary?: boolean }>;
  showDefaultCta?: boolean;
}) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [count, setCount] = useState(0);

  const isCheckout = variant === "checkout";
  const isAuth = variant === "auth";

  const showCart = !isCheckout && !isAuth;
  const showNav = !isCheckout;
  const showMenu = !isCheckout;
  const showCtaButtons = !isCheckout && !isAuth;

  const primaryCta = actions.filter((a) => a.primary).slice(0, 1)[0]
    ?? (showDefaultCta && showCtaButtons ? { href: "/urunler/nfc-kart?paket=premium", label: "Kartını seç", primary: true } : null);
  const showAccountLink = (signedIn || !isAuth) && showCtaButtons;

  useEffect(() => {
    void getBrowserIdentity().then((identity) => setSignedIn(Boolean(identity)));
    const sync = () => setCount(cartCount());
    sync();
    window.addEventListener("yenomi-cart-change", sync);
    return () => window.removeEventListener("yenomi-cart-change", sync);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const lockWithFixedBody = window.matchMedia("(max-width: 980px)").matches;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    if (lockWithFixedBody) {
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.width = "100%";
    }

    requestAnimationFrame(() => {
      const firstFocusable = navRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
        return;
      }

      if (event.key === "Tab" && navRef.current) {
        const focusables = Array.from(
          navRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      if (lockWithFixedBody) {
        window.scrollTo(0, scrollY);
      }
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className={`yi-header yi-header--${variant}`}>
      {open ? (
        <button
          className="yi-nav-backdrop"
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => {
            setOpen(false);
            menuRef.current?.focus();
          }}
        />
      ) : null}
      <div className="yi-container yi-header__inner">
        <Brand />
        {showNav && (
          <nav id="site-primary-nav" ref={navRef} className={`yi-nav${open ? " is-open" : ""}`} aria-label="Ana menü">
            {open && (
              <div className="yi-nav__header">
                <span className="yi-nav__title">Menü</span>
                <button
                  className="yi-nav-close"
                  type="button"
                  aria-label="Menüyü kapat"
                  onClick={() => {
                    setOpen(false);
                    menuRef.current?.focus();
                  }}
                >
                  <Icon name="close" />
                </button>
              </div>
            )}
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
            {showAccountLink ? (
              <Link className="yi-nav__funnel" href={signedIn ? "/hesabim" : "/giris"} onClick={() => setOpen(false)}>
                {signedIn ? "Hesabım" : "Giriş Yap"}
              </Link>
            ) : null}
          </nav>
        )}
        <div className="yi-header__actions">
          {showCart && (
            <Link className="yi-cart" href="/sepet" aria-label={count ? `Sepet, ${count} ürün` : "Sepet"}>
              <Icon name="cart" />
              <span className="yi-cart__label">Sepet</span>
              {count > 0 && <b>{count}</b>}
            </Link>
          )}
          {primaryCta ? <ButtonLink href={primaryCta.href} variant="primary">{primaryCta.label}</ButtonLink> : null}
          {showAccountLink ? <ButtonLink href={signedIn ? "/hesabim" : "/giris"} variant="ghost">{signedIn ? "Hesabım" : "Giriş Yap"}</ButtonLink> : null}
          {showMenu && (
            <button
              ref={menuRef}
              className="yi-menu"
              type="button"
              aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
              aria-controls="site-primary-nav"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <span /><span /><span />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
