export const RESERVED_CARD_SLUGS = new Set([
  "api", "admin", "aktivasyon", "checkout", "giris", "gizlilik", "iade-iptal",
  "kartim", "kartlarim", "kayit", "kurumsal", "mesafeli-satis-sozlesmesi",
  "nfc-siparis", "odeme", "olustur", "p", "sepet", "siparislerim", "urunler",
  "login", "api", "support", "company", "settings", "superadmin", "help",
  "e", "event", "events", "card", "cards",
  "sevcanesimkaradeniz", "aliemrekaradeniz",
]);

export function normalizeCardSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function validateCardSlug(value: string): string {
  if (RESERVED_CARD_SLUGS.has(value)) return "Bu bağlantı sistem tarafından kullanılıyor.";
  if (value.length < 3) return "Bağlantı en az 3 karakter olmalı.";
  if (value.length > 50) return "Bağlantı en fazla 50 karakter olabilir.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return "Yalnızca küçük harf, rakam ve tire kullanabilirsin.";
  return "";
}
