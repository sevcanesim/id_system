"use client";

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import { Arrow, Icon } from "./icons";
import { toGoogleMapsUrl } from "../lib/maps";
import type { OrganizationRole } from "../lib/organizations/permissions";
import { cardQrUrl, cardVcardPath } from "../lib/public-card/urls";

export type CardTemplateLink = {
  title: string;
  subtitle: string;
  href: string;
  kind: "phone" | "mail" | "external" | "map" | "social" | "whatsapp";
};

export type EditableCardData = {
  name: string;
  role: string;
  company: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  linkedin: string;
  instagram: string;
  location: string;
  image: string;
  bio?: string;
  links?: CardTemplateLink[];
  whatsappHref?: string;
  saveHref?: string;
};

export type CardBranding = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  companyName?: string | null;
  variant?: "ESSENTIAL" | "PROFESSIONAL" | "EXECUTIVE" | "CLASSIC" | "MINIMAL" | null;
};

type Props = {
  data: EditableCardData;
  preview?: boolean;
  slug?: string;
  publicId?: string | null;
  extras?: ReactNode;
  saveLabel?: { title: string; subtitle: string };
  imagePosition?: string;
  branding?: CardBranding | null;
  corporateRole?: OrganizationRole | null;
};

function safeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : null;
}

function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function cleanPhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function external(value: string) {
  if (!value) return "#";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export default function CardTemplate({ data, preview = false, slug, publicId, extras, saveLabel, imagePosition, branding, corporateRole }: Props) {
  const role = [data.role, data.company].filter(Boolean).join(" · ") || "Ünvan · Şirket";
  const phone = cleanPhone(data.phone);
  const whatsapp = cleanPhone(data.whatsapp || data.phone).replace(/^\+/, "");
  const initials = data.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YK";
  const [qrDataUrl, setQrDataUrl] = useState("");

  const generatedLinks = [
    data.phone && { title: "Telefon", subtitle: data.phone, href: `tel:${phone}`, kind: "phone" as const },
    data.email && { title: "E-posta", subtitle: data.email, href: `mailto:${data.email}`, kind: "mail" as const },
    data.website && { title: "Web Sitesi", subtitle: data.website.replace(/^https?:\/\//, ""), href: external(data.website), kind: "external" as const },
    data.location && { title: "Konum", subtitle: data.location.replace(/^https?:\/\//, ""), href: toGoogleMapsUrl(data.location), kind: "map" as const },
    data.linkedin && { title: "LinkedIn", subtitle: data.linkedin.replace(/^https?:\/\//, ""), href: external(data.linkedin), kind: "social" as const },
    data.instagram && { title: "Instagram", subtitle: data.instagram.replace(/^https?:\/\//, ""), href: external(data.instagram), kind: "social" as const },
  ].filter(Boolean) as CardTemplateLink[];
  const links = data.links?.length ? data.links : generatedLinks;

  const clickProps = preview ? { onClick: (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault() } : {};
  const saveHref = data.saveHref || (publicId ? cardVcardPath(publicId) : slug ? `/${slug}/vcard` : "#");
  const whatsappHref = data.whatsappHref || (whatsapp ? `https://wa.me/${whatsapp}` : "");
  const publicHref = publicId ? cardQrUrl(publicId) : slug ? `https://qr.yenomilabs.com/${slug.replace(/^\//, "")}` : "https://qr.yenomilabs.com";

  const brandColor = safeHexColor(branding?.primaryColor);
  const brandLogo = safeImageUrl(branding?.logoUrl);
  const rawBrandVariant = branding?.variant || "ESSENTIAL";
  const brandVariant = rawBrandVariant === "CLASSIC" ? "ESSENTIAL" : rawBrandVariant === "MINIMAL" ? "PROFESSIONAL" : rawBrandVariant;
  const isCorporate = Boolean(branding?.variant || branding?.companyName || brandLogo || brandColor);
  const companyName = branding?.companyName || data.company || "Yenomilabs";
  const corporateIdentityBadge = corporateRole === "OWNER"
    ? "Şirket Sahibi"
    : corporateRole
      ? `${companyName} çalışanı`
      : null;

  useEffect(() => {
    if (!preview || !isCorporate || brandVariant !== "EXECUTIVE") {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(publicHref, { width: 360, margin: 1, errorCorrectionLevel: "H" })
      .then((value) => { if (!cancelled) setQrDataUrl(value); })
      .catch(() => { if (!cancelled) setQrDataUrl(""); });
    return () => { cancelled = true; };
  }, [brandVariant, isCorporate, publicHref]);

  const identityPhoto = (className: string) => data.image
    ? <img className={className} src={data.image} alt={`${data.name || "Profil"} görseli`} style={{ objectPosition: imagePosition ?? "50% 50%" }} />
    : <span className={`${className} corporate-avatar-fallback`}>{initials}</span>;

  const corporateBrand = (
    <div className="corp-logo-lockup">
      {brandLogo ? <img src={brandLogo} alt={`${companyName} logosu`} /> : <span className="corp-logo-symbol">Y</span>}
      <strong>{companyName}</strong>
    </div>
  );

  const contactLinks = generatedLinks.filter((link) => link.kind === "phone" || link.kind === "mail" || link.kind === "map");

  if (!preview) {
    const directContacts = generatedLinks.filter((link) => ["phone", "mail", "map"].includes(link.kind));
    const socialLinks = generatedLinks.filter((link) => link.kind === "social");
    const managedLinks = data.links ?? [];

    return (
      <article className={`p12-public-card ${isCorporate ? "is-corporate" : "is-individual"}`} aria-label={`${data.name || "Dijital kartvizit"}`} style={brandColor ? ({ "--card-brand-color": brandColor } as CSSProperties) : undefined}>
        <header className="p12-card-brand">
          <a href="https://qr.yenomilabs.com" aria-label="Yenomi ID ana sayfa">
            {isCorporate ? corporateBrand : <><span className="p12-brand-mark">Y</span><span><strong>Yenomi ID</strong><small>Digital identity</small></span></>}
          </a>
          {isCorporate && <span className="p12-managed-badge"><Icon name="shield" /> Kurumsal profil</span>}
        </header>

        <section className="p12-identity">
          {identityPhoto("p12-avatar")}
          <div className="p12-identity-copy">
            <h1>{data.name || "Ad Soyad"}</h1>
            <p>{data.role || "Ünvan"}</p>
            {(data.company || branding?.companyName) && <span>{data.company || branding?.companyName}</span>}
          </div>
        </section>

        {data.bio && <section className="p12-section p12-bio-section" aria-labelledby="p12-bio-title">
          <div className="p12-section-heading"><h2 id="p12-bio-title">About</h2></div>
          <p className="p12-bio">{data.bio}</p>
        </section>}

        <a className="p12-save-contact" href={saveHref}>
          <span className="p12-save-icon"><Icon name="save" /></span>
          <span><strong>{saveLabel?.title || "Rehbere Kaydet"}</strong><small>{saveLabel?.subtitle || "İletişim bilgilerini tek dokunuşla ekle"}</small></span>
          <Arrow />
        </a>

        <nav className="p12-quick-actions" aria-label="Hızlı iletişim">
          {phone && <a href={`tel:${phone}`}><Icon name="phone" /><span>Ara</span></a>}
          {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener"><Icon name="whatsapp" /><span>WhatsApp</span></a>}
          {data.email && <a href={`mailto:${data.email}`}><Icon name="mail" /><span>E-posta</span></a>}
          {data.website && <a href={external(data.website)} target="_blank" rel="noopener"><Icon name="external" /><span>Web</span></a>}
        </nav>

        {directContacts.length > 0 && <section className="p12-section" aria-labelledby="p12-contact-title">
          <div className="p12-section-heading"><h2 id="p12-contact-title">İletişim</h2></div>
          <div className="p12-contact-list">
            {directContacts.map((link) => <a href={link.href} key={`${link.title}-${link.href}`} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener" : undefined}><span className="p12-row-icon"><Icon name={link.kind} /></span><span><strong>{link.title}</strong><small>{link.subtitle}</small></span><Arrow /></a>)}
          </div>
        </section>}

        {socialLinks.length > 0 && <section className="p12-section" aria-labelledby="p12-social-title">
          <div className="p12-section-heading"><h2 id="p12-social-title">Sosyal</h2></div>
          <div className="p12-social-links">
            {socialLinks.map((link) => <a href={link.href} key={`${link.title}-${link.href}`} target="_blank" rel="noopener"><Icon name="social" /><span>{link.title}</span></a>)}
          </div>
        </section>}

        {managedLinks.length > 0 && <section className="p12-section" aria-labelledby="p12-links-title">
          <div className="p12-section-heading"><h2 id="p12-links-title">{isCorporate ? "Kurumsal bağlantılar" : "Bağlantılar"}</h2></div>
          <div className="p12-managed-links">
            {managedLinks.slice(0, 6).map((link) => <a href={link.href} key={`${link.title}-${link.href}`} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener" : undefined}><span><strong>{link.title}</strong><small>{link.subtitle}</small></span><Arrow /></a>)}
          </div>
        </section>}

        {extras}

        <footer className="p12-card-footer">
          <a href="https://qr.yenomilabs.com">Yenomi ID</a>
          <span>{isCorporate ? `${companyName} tarafından yönetilir` : "Dijital kartvizit"}</span>
        </footer>
      </article>
    );
  }

  if (isCorporate) {
    return (
      <div
        className={`corporate-card-shell corporate-template-${brandVariant.toLowerCase()} ${preview ? "embedded-card-preview" : ""}`}
        style={brandColor ? ({ "--card-brand-color": brandColor } as CSSProperties) : undefined}
      >
        {brandVariant === "ESSENTIAL" && (
          <div className="corp-essential-card">
            <header className="corp-essential-header">
              {corporateBrand}
              <span className="corp-menu-dot">•••</span>
            </header>

            <section className="corp-essential-identity">
              {identityPhoto("corp-essential-avatar")}
              <div>
                <h1>{data.name || "Ad Soyad"}</h1>
                <p>{data.role || "Ünvan"}</p>
                <small>{data.company || companyName}</small>
                {corporateIdentityBadge && (
                  <span className="corp-employee-badge">
                    <Icon name={corporateRole === "OWNER" ? "shield" : "user"} />
                    {corporateIdentityBadge}
                  </span>
                )}
              </div>
            </section>

            <nav className="corp-main-actions corp-main-actions-dark" aria-label="Hızlı iletişim">
              {phone && <a href={`tel:${phone}`} {...clickProps}><Icon name="phone" /><span>Ara</span></a>}
              {data.email && <a href={`mailto:${data.email}`} {...clickProps}><Icon name="mail" /><span>E-posta</span></a>}
              <a href={saveHref} {...clickProps}><Icon name="save" /><span>Rehbere Kaydet</span></a>
            </nav>

            <nav className="corp-social-strip" aria-label="Sosyal bağlantılar">
              {data.linkedin && <a href={external(data.linkedin)} target="_blank" rel="noopener" {...clickProps}><Icon name="social" /> LinkedIn</a>}
              {data.website && <a href={external(data.website)} target="_blank" rel="noopener" {...clickProps}><Icon name="external" /> Web Sitesi</a>}
              {data.location && <a href={toGoogleMapsUrl(data.location)} target="_blank" rel="noopener" {...clickProps}><Icon name="map" /> Konum</a>}
              {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener" {...clickProps}><Icon name="whatsapp" /> WhatsApp</a>}
            </nav>

            <section className="corp-info-section">
              <h2>İLETİŞİM BİLGİLERİ</h2>
              <div className="corp-contact-table">
                {contactLinks.slice(0, 4).map((link) => <a href={link.href} key={`${link.title}-${link.href}`} {...clickProps}><Icon name={link.kind} /><span><b>{link.subtitle}</b><small>{link.title}</small></span></a>)}
              </div>
            </section>

            {data.bio && <section className="corp-info-section corp-about-section">
              <h2>HAKKIMDA</h2>
              <p>{data.bio}</p>
            </section>}

            <section className="corp-info-section corp-resource-section">
              <h2>KURUMSAL BAĞLANTILAR</h2>
              {data.links?.length ? data.links.slice(0, 4).map((link) => <a href={link.href} key={`${link.title}-${link.href}`} {...clickProps}><Icon name="link" /><span><b>{link.title}</b><small>{link.subtitle}</small></span><Arrow /></a>) : <>
                <a href={data.website ? external(data.website) : "#"} {...clickProps}><Icon name="box" /><span><b>Ürün Kataloğu</b><small>Kurumsal ürün ve hizmetler</small></span><Arrow /></a>
                <a href={data.website ? external(data.website) : "#"} {...clickProps}><Icon name="building" /><span><b>Şirket Sunumu</b><small>{companyName}</small></span><Arrow /></a>
                <a href={data.email ? `mailto:${data.email}` : "#"} {...clickProps}><Icon name="clock" /><span><b>Toplantı Planla</b><small>İletişime geç</small></span><Arrow /></a>
              </>}
            </section>

            <footer className="corp-card-footer"><span>Bu kart {companyName} tarafından yönetilmektedir.</span><b>Powered by Yenomi ID</b></footer>
          </div>
        )}

        {brandVariant === "PROFESSIONAL" && (
          <div className="corp-professional-card">
            <div className="corp-professional-pattern" />
            <header className="corp-professional-header">{corporateBrand}<span>☰</span></header>

            <section className="corp-professional-hero">
              <div className="corp-professional-copy">
                <h1>{data.name || "Ad Soyad"}</h1>
                <p>{data.role || "Ünvan"}</p>
                <small><Icon name="building" /> {data.company || companyName}</small>
                <span><Icon name="shield" /> {companyName} çalışanı</span>
              </div>
              {identityPhoto("corp-professional-avatar")}
            </section>

            <nav className="corp-main-actions corp-main-actions-outline">
              {phone && <a href={`tel:${phone}`} {...clickProps}><Icon name="phone" /><span>Ara</span></a>}
              {data.email && <a href={`mailto:${data.email}`} {...clickProps}><Icon name="mail" /><span>E-posta</span></a>}
              <a href={saveHref} {...clickProps}><Icon name="save" /><span>Rehbere Kaydet</span></a>
            </nav>

            <nav className="corp-professional-socials">
              {data.linkedin && <a href={external(data.linkedin)} target="_blank" rel="noopener" {...clickProps}><Icon name="social" /> LinkedIn</a>}
              {data.website && <a href={external(data.website)} target="_blank" rel="noopener" {...clickProps}><Icon name="external" /> Web Sitesi</a>}
              {data.location && <a href={toGoogleMapsUrl(data.location)} target="_blank" rel="noopener" {...clickProps}><Icon name="map" /> Konum</a>}
              {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener" {...clickProps}><Icon name="whatsapp" /> WhatsApp</a>}
            </nav>

            <section className="corp-professional-contact">
              <h2>İLETİŞİM BİLGİLERİ</h2>
              <div>{contactLinks.slice(0, 4).map((link) => <a href={link.href} key={`${link.title}-${link.href}`} {...clickProps}><Icon name={link.kind} /><span><b>{link.subtitle}</b><small>{link.title}</small></span></a>)}</div>
            </section>

            {data.bio && <section className="corp-professional-contact corp-about-section">
              <h2>HAKKIMDA</h2>
              <p>{data.bio}</p>
            </section>}

            <section className="corp-professional-expertise">
              <h2>ÇALIŞMA ALANLARI</h2>
              <div><span>{data.role || "Profesyonel Hizmetler"}</span><span>Kurumsal Çözümler</span><span>Müşteri İlişkileri</span></div>
            </section>

            <section className="corp-professional-company">
              <div className="corp-company-banner">{corporateBrand}<small>Kurumsal kaynaklar ve dijital içerikler</small></div>
              <h2>KURUMSAL BAĞLANTILAR</h2>
              <div className="corp-company-grid">
                {(data.links?.length ? data.links : [
                  { title: "Ürün Kataloğu", subtitle: "Güncel katalog", href: data.website ? external(data.website) : "#", kind: "external" as const },
                  { title: "Şirket Sunumu", subtitle: "Kurumsal sunum", href: data.website ? external(data.website) : "#", kind: "external" as const },
                  { title: "Toplantı Planla", subtitle: "Randevu oluştur", href: data.email ? `mailto:${data.email}` : "#", kind: "mail" as const },
                  { title: "Referans Projeler", subtitle: "Projeleri incele", href: data.website ? external(data.website) : "#", kind: "external" as const },
                ]).slice(0, 4).map((link) => <a href={link.href} key={link.title} {...clickProps}><Icon name={link.kind} /><b>{link.title}</b><small>{link.subtitle}</small></a>)}
              </div>
            </section>

            <footer className="corp-card-footer"><span>Kurumsal bilgiler merkezi olarak yönetilir.</span><b>Powered by Yenomi ID</b></footer>
          </div>
        )}

        {brandVariant === "EXECUTIVE" && (
          <div className="corp-executive-card">
            <div className="corp-executive-network" />
            <header className="corp-executive-header">{corporateBrand}<span>☰</span></header>

            <div className="corp-executive-hero">
              <section className="corp-executive-identity">
                {identityPhoto("corp-executive-avatar")}
                <div><span className="corp-executive-kicker">EXECUTIVE PROFILE</span><h1>{data.name || "Ad Soyad"}</h1><p>{data.role || "Ünvan"}</p><small>{data.company || companyName}</small></div>
              </section>
              <section className="corp-executive-qr">
                <div>{qrDataUrl ? <img src={qrDataUrl} alt="Dijital kart QR kodu" /> : <Icon name="qr" />}</div>
                <span>Kartı paylaş</span>
              </section>
            </div>

            <nav className="corp-main-actions corp-main-actions-executive">
              {phone && <a href={`tel:${phone}`} {...clickProps}><Icon name="phone" /><span>Ara</span></a>}
              {data.email && <a href={`mailto:${data.email}`} {...clickProps}><Icon name="mail" /><span>E-posta</span></a>}
              <a href={saveHref} {...clickProps}><Icon name="save" /><span>Rehbere Kaydet</span></a>
            </nav>

            <nav className="corp-executive-socials">
              {data.linkedin && <a href={external(data.linkedin)} target="_blank" rel="noopener" {...clickProps}><Icon name="social" /><span>LinkedIn</span></a>}
              {data.website && <a href={external(data.website)} target="_blank" rel="noopener" {...clickProps}><Icon name="external" /><span>Web</span></a>}
              {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener" {...clickProps}><Icon name="whatsapp" /><span>WhatsApp</span></a>}
            </nav>

            <section className="corp-executive-info">
              <h2>İLETİŞİM BİLGİLERİ</h2>
              {contactLinks.slice(0, 3).map((link) => <a href={link.href} key={`${link.title}-${link.href}`} {...clickProps}><Icon name={link.kind} /><span><b>{link.subtitle}</b><small>{link.title}</small></span></a>)}
            </section>

            <section className="corp-executive-resources">
              <h2>KURUMSAL BAĞLANTILAR</h2>
              <div>{(data.links?.length ? data.links : [
                { title: "Şirket Sunumu", subtitle: companyName, href: data.website ? external(data.website) : "#", kind: "external" as const },
                { title: "Referanslar", subtitle: "Projeler", href: data.website ? external(data.website) : "#", kind: "external" as const },
                { title: "Toplantı", subtitle: "Randevu", href: data.email ? `mailto:${data.email}` : "#", kind: "mail" as const },
              ]).slice(0, 3).map((link) => <a href={link.href} key={link.title} {...clickProps}><Icon name={link.kind} /><b>{link.title}</b></a>)}</div>
            </section>

            <footer className="corp-card-footer corp-executive-footer"><span>{companyName}</span><b>Powered by Yenomi ID</b></footer>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`qr-wrap compact-wrap ${preview ? "embedded-card-preview" : ""}`}>
      <div className="brand-top">
        <a className="brand-pill" href="https://qr.yenomilabs.com" aria-label="Yenomilabs ana sayfa" {...clickProps}>
          <span className="brand-dot" /><span>Powered by <strong>Yenomilabs</strong></span>
        </a>
      </div>
      <section className="compact-card" aria-label={`${data.name || "Dijital kartvizit"}`}>
        <div className={`compact-cover ${!data.image ? "compact-cover-placeholder" : ""}`}>
          {data.image ? <img src={data.image} alt={`${data.name || "Profil"} görseli`} style={{ objectPosition: imagePosition ?? "50% 50%" }} /> : <b>{initials}</b>}
          <div className="compact-shade" />
        </div>
        <div className="compact-identity"><div className="identity-copy"><h1>{data.name || "Ad Soyad"}</h1><p>{role}</p></div><span className="verified-pill">Dijital Kartvizit</span></div>
        <div className="quick-actions" aria-label="Hızlı iletişim">
          {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener" aria-label="WhatsApp" {...clickProps}><Icon name="whatsapp" /><span>WhatsApp</span></a>}
          {phone && <a href={`tel:${phone}`} aria-label="Telefon" {...clickProps}><Icon name="phone" /><span>Ara</span></a>}
          {data.email && <a href={`mailto:${data.email}`} aria-label="E-posta" {...clickProps}><Icon name="mail" /><span>E-posta</span></a>}
          <a className="save-quick" href={saveHref} aria-label="Kişiyi kaydet" {...clickProps}><Icon name="save" /><span>Kaydet</span></a>
        </div>
        <a className="primary-save" href={saveHref} {...clickProps}><span className="primary-save-icon"><Icon name="save" /></span><span><strong>Rehbere Kaydet</strong><small>.vcf iletişim dosyasını indir</small></span><Arrow /></a>
      </section>
      <section className="compact-links" aria-label="İletişim bağlantıları">
        {links.length ? links.map((link) => <a className="compact-link" href={link.href} key={`${link.title}-${link.href}`} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener" : undefined} {...clickProps}><span className="compact-link-icon"><Icon name={link.kind} /></span><span className="compact-link-copy"><strong>{link.title}</strong><small>{link.subtitle}</small></span><span className="compact-link-arrow"><Arrow /></span></a>) : <div className="compact-link compact-link-empty"><span className="compact-link-icon"><Icon name="phone" /></span><span className="compact-link-copy"><strong>İletişim bilgileri</strong><small>Doldurduğun bilgiler burada aynı düzende görünür.</small></span></div>}
      </section>
      <footer className="compact-footer"><a href="https://qr.yenomilabs.com" {...clickProps}>Yenomi ID ile hazırlandı.</a><span>© 2026 Yenomilabs</span></footer>
    </div>
  );
}
