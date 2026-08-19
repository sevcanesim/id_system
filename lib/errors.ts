export type PublicErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "PAYMENT_UNAVAILABLE"
  | "ORDER_LOAD_FAILED"
  | "ORDER_FETCH_FAILED"
  | "ACTIVATION_FAILED"
  | "ORDER_CREATE_FAILED"
  | "ORDER_UPDATE_FAILED"
  | "PAYMENT_IN_PROGRESS"
  | "IDEMPOTENCY_CONFLICT"
  | "ORDER_ALREADY_PAID"
  | "UNKNOWN_ERROR";

const DEFAULT_MESSAGES: Record<PublicErrorCode, string> = {
  AUTH_REQUIRED: "Bu işlemi tamamlamak için giriş yapmalısın.",
  FORBIDDEN: "Bu işlem için yetkin bulunmuyor.",
  VALIDATION_ERROR: "Gönderilen bilgileri kontrol edip yeniden dene.",
  PAYMENT_UNAVAILABLE: "Ödeme işlemi şu anda başlatılamıyor. Lütfen kısa süre sonra yeniden dene.",
  ORDER_LOAD_FAILED: "Sipariş bilgileri şu anda yüklenemiyor. Lütfen yeniden dene.",
  ORDER_FETCH_FAILED: "Yenomi ID hizmet bilgileri şu anda yüklenemiyor. Lütfen yeniden dene.",
  ACTIVATION_FAILED: "Aktivasyon şu anda tamamlanamıyor. Lütfen yeniden dene.",
  ORDER_CREATE_FAILED: "Sipariş şu anda oluşturulamıyor. Lütfen yeniden dene.",
  ORDER_UPDATE_FAILED: "Sipariş şu anda güncellenemiyor. Lütfen yeniden dene.",
  PAYMENT_IN_PROGRESS: "Ödeme isteğin işleniyor. Lütfen birkaç saniye bekleyip yeniden dene.",
  IDEMPOTENCY_CONFLICT: "Bu ödeme isteği farklı sipariş bilgileriyle daha önce kullanılmış. Lütfen sayfayı yenileyip yeniden dene.",
  ORDER_ALREADY_PAID: "Bu siparişin ödemesi zaten tamamlanmış.",
  UNKNOWN_ERROR: "Beklenmeyen bir sorun oluştu. Lütfen yeniden dene.",
};

export function createErrorReference(prefix = "ERR"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function publicError(
  code: PublicErrorCode,
  options?: { message?: string; reference?: string }
): { error: string; code: PublicErrorCode; reference: string } {
  return {
    error: options?.message ?? DEFAULT_MESSAGES[code],
    code,
    reference: options?.reference ?? createErrorReference(),
  };
}

/**
 * Supabase Auth error codes mapped to safe, localized, user-facing messages.
 * Uses an allowlist: only codes listed here ever reach the user. Any error
 * without a mapped code (including raw SDK text like "Invalid login
 * credentials") falls back to the caller-supplied generic message instead
 * of being shown verbatim.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-posta veya şifre hatalı.",
  email_not_confirmed: "E-posta adresini onaylamadan giriş yapamazsın. Gelen kutunu kontrol et.",
  user_already_exists: "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene.",
  email_exists: "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene.",
  weak_password: "Şifren çok zayıf. En az 8 karakter kullan.",
  user_not_found: "Bu bilgilerle eşleşen bir hesap bulunamadı.",
  same_password: "Yeni şifre eskisiyle aynı olamaz.",
  session_expired: "Oturum süresi dolmuş. Lütfen yeniden giriş yap.",
  signup_disabled: "Şu anda yeni kayıt kabul edilmiyor.",
  over_email_send_rate_limit: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar dene.",
  over_request_rate_limit: "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar dene.",
  provider_email_needs_verification: "Bu sağlayıcı ile giriş için e-posta doğrulaması gerekiyor.",
  unexpected_failure: "Giriş hizmetine ulaşılamadı. Bağlantını kontrol edip yeniden dene.",
};

function isAuthTransportError(error: object): boolean {
  const candidate = error as { name?: unknown; code?: unknown; status?: unknown };
  if (candidate.name === "AuthRetryableFetchError") return true;
  if (candidate.code === "unexpected_failure") return true;
  if (candidate.status === 0) return true;
  return false;
}

/**
 * Maps a Supabase Auth SDK error to a safe, localized message. Never returns
 * the SDK's raw `message` text — only a pre-approved string keyed by the
 * error's stable `code`, or the caller's fallback when the code is unknown.
 */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  if (isAuthTransportError(error)) {
    return AUTH_ERROR_MESSAGES.unexpected_failure;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  return fallback;
}

export function safeClientMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as { error?: unknown; message?: unknown };
  const message = typeof candidate.error === "string"
    ? candidate.error
    : typeof candidate.message === "string"
      ? candidate.message
      : "";

  const blockedPatterns = [
    /api\s*key/i,
    /supabase/i,
    /postgres/i,
    /sql/i,
    /relation\s+["']?/i,
    /stack/i,
    /jwt/i,
    /service[_ -]?role/i,
  ];

  return message && !blockedPatterns.some((pattern) => pattern.test(message)) ? message : fallback;
}
