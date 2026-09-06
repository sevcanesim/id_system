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

## Promotion kanıtı

Staging testleri tamamlandıktan sonra gizli anahtar ve müşteri kişisel verisi içermeyen kanıt özeti, erişimi sınırlı release kaydında saklanır. Kaynak kod içinde eski bir "phase0" script'i bu kanıtın yerine geçmez; production promotion, güncel staging ve production gate'leri tamamlanmadan yapılmaz.
