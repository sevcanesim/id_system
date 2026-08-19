# Faz 0 — Runtime Acceptance

Production ödeme açılmadan önce staging/sandbox ortamında aşağıdaki kanıtlar saklanmalıdır:

- 10 başarılı sandbox ödeme → callback → order → entitlement → activation senaryosu.
- 5 başarısız ödeme senaryosu; yanlışlıkla PAID/entitlement oluşmamalı.
- 5 tekrar callback senaryosu; duplicate order/entitlement oluşmamalı.
- 5 claim-recovery / aktivasyon yeniden gönderim senaryosu.
- Fresh Supabase migration kurulumu ve migration drift kontrolü.
- Production domain üzerinden internetten erişilebilir callback doğrulaması.
- Rate-limit ve production environment doğrulaması.

Bu testlerin gerçek credential ve remote runtime gerektiren kısımları yerel kaynak paketinden otomatik olarak kanıtlanamaz; promotion gate bu nedenle credential/runtime kanıtı olmadan production açılışına izin vermemelidir.

## Makine tarafından doğrulanan promotion kanıtı

Staging testleri tamamlandıktan sonra gizli anahtar içermeyen kanıt özeti `runtime-evidence/phase0-payment-evidence.json` olarak oluşturulur. `npm run verify:roadmap:phase0:evidence` komutu production promotion öncesinde aşağıdaki minimumları zorunlu tutar: 10 başarılı ödeme, 5 başarısız ödeme, 5 callback replay ve 5 claim-recovery. Ayrıca başarısız ödemenin entitlement üretmediğini, replay sırasında duplicate order/entitlement oluşmadığını, fresh DB migration'ın geçtiğini ve callback'in internetten erişilebilir olduğunu doğrular.

Örnek şema `runtime-evidence/phase0-payment-evidence.example.json` dosyasındadır. API key, secret, service-role key veya müşteri kişisel verisi bu kanıt dosyasına yazılmamalıdır.
