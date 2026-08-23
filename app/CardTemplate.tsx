"use client";

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import { Arrow, Icon } from "./icons";
import { toGoogleMapsUrl } from "../lib/maps";
import type { OrganizationRole } from "../lib/organizations/permissions";
import { cardQrUrl, cardVcardPath, publicCardOrigin } from "../lib/public-card/urls";

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

function displayIdentity(data: EditableCardData, preview: boolean) {
  const name = data.name.trim();
  const role = data.role.trim();
  const company = data.company.trim();

  if (!preview) return { name, role, company };

  return {
    name: name || "Selin Kaya",
    role: role || "Ürün Yöneticisi",
    company: company || "Yenomi Labs",
  };
}

export default function CardTemplate({ data, preview = false, slug, publicId, extras, saveLabel, imagePosition, branding, corporateRole }: Props) {
  const identity = displayIdentity(data, preview);
  const phone = cleanPhone(data.phone);
  const whatsapp = cleanPhone(data.whatsapp || data.phone).replace(/^\+/, "");
  const initials = identity.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YI";
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => { setImgError(false); }, [data.image]);
  useEffect(() => { setLogoError(false); }, [branding?.logoUrl]);

  const generatedLinks = [
    data.phone && { title: "Telefon", subtitle: data.phone, href: `tel:${phone}`, kind: "phone" as const },
    data.email && { title: "E-posta", subtitle: data.email, href: `mailto:${data.email}`, kind: "mail" as const },
    data.website && { title: "Web Sitesi", subtitle: data.website.replace(/^https?:\/\//, ""), href: external(data.website), kind: "external" as const },
    data.location && { title: "Konum", subtitle: data.location.replace(/^https?:\/\//, ""), href: toGoogleMapsUrl(data.location), kind: "map" as const },
    data.linkedin && { title: "LinkedIn", subtitle: data.linkedin.replace(/^https?:\/\//, ""), href: external(data.linkedin), kind: "social" as const },
    data.instagram && { title: "Instagram", subtitle: data.instagram.replace(/^https?:\/\//, ""), href: external(data.instagram), kind: "social" as const },
  ].filter(Boolean) as CardTemplateLink[];

  const clickProps = preview ? { onClick: (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault() } : {};
  const saveHref = data.saveHref || (publicId ? cardVcardPath(publicId) : slug ? `/${slug}/vcard` : "#");
  const whatsappHref = data.whatsappHref || (whatsapp ? `https://wa.me/${whatsapp}` : "");
  const siteOrigin = publicCardOrigin();
  const publicHref = publicId ? cardQrUrl(publicId) : slug ? `${siteOrigin}/${slug.replace(/^\//, "")}` : siteOrigin;

  const brandColor = safeHexColor(branding?.primaryColor);
  const brandLogo = safeImageUrl(branding?.logoUrl);
  const rawBrandVariant = branding?.variant || "ESSENTIAL";
  const brandVariant = rawBrandVariant === "CLASSIC" ? "ESSENTIAL" : rawBrandVariant === "MINIMAL" ? "PROFESSIONAL" : rawBrandVariant;
  const isCorporate = Boolean(branding?.variant || branding?.companyName || brandLogo || brandColor);
  const companyName = branding?.companyName || identity.company || "Yenomi Labs";
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
  }, [brandVariant, isCorporate, publicHref, preview]);

  const identityPhoto = (className: string) => (data.image && !imgError)
    ? <img className={className} src={data.image} alt={`${identity.name || "Profil"} görseli`} onError={() => setImgError(true)} style={{ objectPosition: imagePosition ?? "50% 50%" }} />
    : <span className={`${className} corporate-avatar-fallback`}>{initials}</span>;

  const corporateBrand = (
    <div className="corp-logo-lockup">
      {(brandLogo && !logoError) ? <img src={brandLogo} alt={`${companyName} logosu`} onError={() => setLogoError(true)} /> : <span className="corp-logo-symbol">Y</span>}
      <strong>{companyName}</strong>
    </div>
  );

  const contactLinks = generatedLinks.filter((link) => link.kind === "phone" || link.kind === "mail" || link.kind === "map");

  if (!preview) {
    const directContacts = generatedLinks.filter((link) => ["phone", "mail", "map"].includes(link.kind));
    const socialLinks = generatedLinks.filter((link) => link.kind === "social");
    const managedLinks = data.links ?? [];

    return (
      <article className={`p12-public-card ${isCorporate ? "is-corporate" : "is-individual"}`} aria-label={identity.name || "Dijital kartvizit"} style={brandColor ? ({ "--card-brand-color": brandColor } as CSSProperties) : undefined}>
        <header className="p12-card-brand">
          <a href={siteOrigin} aria-label="Yenomi ID ana sayfa">
            {isCorporate ? corporateBrand : <><span className="p12-brand-mark">Y</span><span><strong>Yenomi ID</strong><small>Dijital kimlik</small></span></>}
          </a>
          {isCorporate && <span className="p12-managed-badge"><Icon name="shield" /> Kurumsal profil</span>}
        </header>

        <section className="p12-identity">
          {identityPhoto("p12-avatar")}
          <div className="p12-identity-copy">
            {identity.name && <h1>{identity.name}</h1>}
            {identity.role && <p>{identity.role}</p>}
            {(identity.company || branding?.companyName) && <span>{identity.company || branding?.companyName}</span>}
          </div>
        </section>

        {data.bio && <section className="p12-section p12-bio-section" aria-labelledby="p12-bio-title">
          <div className="p12-section-heading"><h2 id="p12-bio-title">Hakkında</h2></div>
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
          <a href={siteOrigin}>Yenomi ID</a>
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
                <h1>{identity.name}</h1>
                <p>{identity.role}</p>
                <small>{identity.company || companyName}</small>
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
              <h2>HAKKINDA</h2>
              <p>{data.bio}</p>
            </section>}

            <section className="corp-info-section corp-resource-section">
              <h2>KURUMSAL BAĞLANTILAR</h2>
              {data.links?.length ? data.links.slice(0, 4).map((link) => <a href={link.href} key={`${link.title}-${link.href}`} {...clickProps}><Icon name="link" /><span><b>{link.title}</b><small>{link.subtitle}</small></span><Arrow /></a>) : null}
            </section>
          </div>
        )}

        {brandVariant === "PROFESSIONAL" && (
          <div className="corp-professional-card">
            <div className="corp-professional-cover">{corporateBrand}</div>
            <section className="corp-professional-identity">
              {identityPhoto("corp-professional-avatar")}
              <h1>{identity.name}</h1>
              <p>{identity.role}</p>
              <span>{identity.company || companyName}</span>
            </section>
            <nav className="corp-main-actions" aria-label="Hızlı iletişim">
              {phone && <a href={`tel:${phone}`} {...clickProps}><Icon name="phone" /><span>Ara</span></a>}
              {data.email && <a href={`mailto:${data.email}`} {...clickProps}><Icon name="mail" /><span>E-posta</span></a>}
              <a href={saveHref} {...clickProps}><Icon name="save" /><span>Kaydet</span></a>
            </nav>
          </div>
        )}

        {brandVariant === "EXECUTIVE" && (
          <div className="corp-executive-card">
            <header>{corporateBrand}</header>
            <section className="corp-executive-identity">
              {identityPhoto("corp-executive-avatar")}
              <h1>{identity.name}</h1>
              <p>{identity.role}</p>
              <span>{identity.company || companyName}</span>
            </section>
            {qrDataUrl && <img className="corp-executive-qr" src={qrDataUrl} alt="Profil QR kodu" />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card-template-preview">
      <section className="card-template-preview__identity">
        {identityPhoto("card-template-preview__avatar")}
        <h1>{identity.name}</h1>
        <p>{[identity.role, identity.company].filter(Boolean).join(" · ")}</p>
      </section>
    </div>
  );
}
