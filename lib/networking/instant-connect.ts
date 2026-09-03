import { isCardProfileServiceActive, type CardProfileRow } from "../card-profile";

export const INSTANT_CONNECT_SOURCES = ["QR", "NFC", "EVENT", "SHARE"] as const;
export type InstantConnectSource = (typeof INSTANT_CONNECT_SOURCES)[number];

export type InstantConnectProfile = Pick<
  CardProfileRow,
  "id" | "user_id" | "name" | "role" | "company" | "email" | "image_url" | "is_published" | "card_status" | "service_expires_at" | "grace_ends_at"
>;

/**
 * A profile can only be offered for an automatic connection when its public
 * card is live and it has enough contact data for the existing lead contract.
 * The API repeats this validation inside the database transaction.
 */
export function isInstantConnectProfileEligible(profile: InstantConnectProfile, now = Date.now()) {
  return profile.is_published
    && profile.card_status === "ACTIVE"
    && isCardProfileServiceActive(profile, now)
    && Boolean(profile.email?.trim());
}

export function isInstantConnectSource(value: string): value is InstantConnectSource {
  return INSTANT_CONNECT_SOURCES.some((source) => source === value);
}

export type InstantConnectErrorCode =
  | "AUTH_REQUIRED"
  | "SOURCE_PROFILE_NOT_FOUND"
  | "TARGET_PROFILE_NOT_FOUND"
  | "SELF_CONNECTION"
  | "SOURCE_PROFILE_UNAVAILABLE"
  | "TARGET_PROFILE_UNAVAILABLE"
  | "SOURCE_EMAIL_REQUIRED"
  | "TARGET_EMAIL_REQUIRED"
  | "INVALID_SOURCE"
  | "INVALID_EVENT_CONTEXT"
  | "HANDSHAKE_FAILED";

export function instantConnectErrorMessage(code: string | undefined, locale: "tr" | "en") {
  const tr: Record<string, string> = {
    AUTH_REQUIRED: "Bu bağlantı için Yenomi ID oturumu gerekli.",
    SOURCE_PROFILE_NOT_FOUND: "Paylaşılabilir Yenomi profiliniz bulunamadı.",
    TARGET_PROFILE_NOT_FOUND: "Kart profili bulunamadı.",
    SELF_CONNECTION: "Kendi profilinizle bağlantı kuramazsınız.",
    SOURCE_PROFILE_UNAVAILABLE: "Profiliniz şu anda paylaşım için uygun değil.",
    TARGET_PROFILE_UNAVAILABLE: "Bu kart şu anda bağlantı kabul etmiyor.",
    SOURCE_EMAIL_REQUIRED: "Otomatik paylaşım için profilinizde geçerli bir e-posta adresi olmalı.",
    TARGET_EMAIL_REQUIRED: "Bu kartın iletişim profili bağlantı için tamamlanmamış.",
    INVALID_SOURCE: "Bağlantı kaynağı doğrulanamadı.",
    INVALID_EVENT_CONTEXT: "Etkinlik bağlantısı doğrulanamadı.",
  };
  const en: Record<string, string> = {
    AUTH_REQUIRED: "A Yenomi ID session is required for this connection.",
    SOURCE_PROFILE_NOT_FOUND: "We could not find a shareable Yenomi profile for you.",
    TARGET_PROFILE_NOT_FOUND: "The card profile could not be found.",
    SELF_CONNECTION: "You cannot connect to your own profile.",
    SOURCE_PROFILE_UNAVAILABLE: "Your profile is not available to share right now.",
    TARGET_PROFILE_UNAVAILABLE: "This card is not accepting connections right now.",
    SOURCE_EMAIL_REQUIRED: "Your profile needs a valid email address for automatic sharing.",
    TARGET_EMAIL_REQUIRED: "This card profile is not complete enough to connect.",
    INVALID_SOURCE: "We could not verify the connection source.",
    INVALID_EVENT_CONTEXT: "We could not verify the event link.",
  };
  return (locale === "tr" ? tr : en)[code || ""]
    || (locale === "tr" ? "Bağlantı kurulamadı. Lütfen tekrar deneyin." : "The connection could not be completed. Please try again.");
}
