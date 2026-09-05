"use client";

import { useState } from "react";
import CardTemplate, { type CardBranding, type EditableCardData } from "../../CardTemplate";
import { type NetworkingLocale } from "../../../lib/networking/catalog";
import type { CardLocaleOverlay } from "../../../lib/public-card/locales";
import NetworkingCapture from "./NetworkingCapture";
import type { PublicCompanyVerification } from "../../../lib/organizations/verified-company";

export default function PublicCardWithNetworking({
  data,
  slug,
  publicId,
  branding,
  profilePublicId,
  profileName,
  organizationName,
  eventId,
  eventLinkId,
  eventName,
  source = "QR",
  locales = [],
  companyVerification,
}: {
  data: EditableCardData;
  slug?: string;
  publicId?: string | null;
  branding?: CardBranding | null;
  profilePublicId: string;
  profileName: string;
  organizationName?: string | null;
  eventId?: string | null;
  eventLinkId?: string | null;
  eventName?: string | null;
  source?: "QR" | "NFC" | "EVENT" | "SHARE";
  locales?: CardLocaleOverlay[];
  companyVerification?: PublicCompanyVerification | null;
}) {
  const [locale, setLocale] = useState<NetworkingLocale>("tr");

  const overlay = locales.find((item) => item.locale === locale);
  const display = {
    ...data,
    role: overlay?.role || data.role,
    bio: overlay?.about || data.bio,
  };

  return (
    <CardTemplate
      data={display}
      slug={slug}
      publicId={publicId}
      branding={branding}
      locale={locale}
      extras={
        <>
          {companyVerification?.verified ? <section className="p12-verified-company" aria-label="Doğrulanmış kurumsal kimlik">
            <span aria-hidden="true">✓</span>
            <div><strong>Doğrulanmış kurumsal kimlik</strong><small>{companyVerification.companyName || organizationName || "Bu kuruluş"} için Yenomi resmi kayıt kontrolü tamamlandı.</small></div>
          </section> : null}
          <NetworkingCapture
            profilePublicId={profilePublicId}
            profileName={profileName}
            organizationName={organizationName}
            eventId={eventId}
            eventLinkId={eventLinkId}
            eventName={eventName}
            source={source}
            locale={locale}
            onLocaleChange={setLocale}
          />
        </>
      }
    />
  );
}
