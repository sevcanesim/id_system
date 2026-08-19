# Faz 0 — Secret Rotation Checklist

Bu dosya secret içermez. Production promotion öncesi her madde operasyon sahibi tarafından doğrulanır.

- Supabase service-role / secret key rotate edildi.
- Kullanılan publishable/anon key politikası kontrol edildi; gerekliyse rotate edildi.
- iyzico API ve secret key rotate edildi.
- Google Maps server ve browser key'leri rotate/restrict edildi.
- Database parolası rotate edildi.
- Upstash token rotate edildi.
- Vercel environment değerleri yeni secret'larla güncellendi.
- Eski deployment'lar ve paylaşılan arşivler secret scan'den geçirildi.
- `npm run verify:secrets` başarılı.
- Production env gate başarılı.
