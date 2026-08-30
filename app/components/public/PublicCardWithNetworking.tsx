"use client";

import { useState } from "react";
import CardTemplate, { type CardBranding, type EditableCardData } from "../../CardTemplate";
import { type NetworkingLocale } from "../../../lib/networking/catalog";
import type { CardLocaleOverlay } from "../../../lib/public-card/locales";
import NetworkingCapture from "./NetworkingCapture";

export default function PublicCardWithNetworking({
  data,
  slug,
  publicId,
  branding,
  profileId,
  profileName,
  organizationName,
  eventId,
  eventName,
  source = "QR",
  locales = [],
}: {
  data: EditableCardData;
  slug?: string;
  publicId?: string | null;
  branding?: CardBranding | null;
  profileId: string;
  profileName: string;
  organizationName?: string | null;
  eventId?: string | null;
  eventName?: string | null;
  source?: "QR" | "NFC" | "EVENT" | "SHARE";
  locales?: CardLocaleOverlay[];
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
      extras={
        <NetworkingCapture
          profileId={profileId}
          profileName={profileName}
          organizationName={organizationName}
          eventId={eventId}
          eventName={eventName}
          source={source}
          locale={locale}
          onLocaleChange={setLocale}
        />
      }
    />
  );
}
