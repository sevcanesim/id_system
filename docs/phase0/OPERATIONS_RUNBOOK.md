# Faz 0 — Sipariş, Ödeme ve Aktivasyon Operasyon Runbook'u

## Amaç
Ödeme alınmış fakat fulfillment/aktivasyon zincirinde sorun yaşayan siparişlerin müşteri kaybına dönüşmeden çözülmesi.

## Günlük sorumluluk matrisi
- Ödeme ve reconciliation: operasyon yöneticisi / teknik sorumlu.
- Kart üretim kuyruğu: üretim sorumlusu.
- Kargo ve takip: fulfillment sorumlusu.
- Aktivasyon ve hesap erişimi: destek + teknik sorumlu.
- KVKK ve sözleşme talepleri: yetkili şirket temsilcisi; hukuki yorum gereken talepler hukuk danışmanına eskale edilir.

## Kritik kontroller
1. PAID olup entitlement oluşmamış siparişleri kontrol et.
2. `commerce_fulfillment_issues` içindeki açık kayıtları kontrol et.
3. Aktivasyon e-postası gönderilememiş veya süresi dolmuş siparişleri kontrol et.
4. PREPARING durumda bekleme süresini aşan siparişleri üretime eskale et.
5. SHIPPED durumda tracking bilgisi bulunmayan sipariş bırakma.

## Reconciliation prosedürü
- Sipariş numarasını, payment attempt durumunu, callback kaydını, order status'ü, order item'ları ve entitlement kayıtlarını aynı işlem zinciri olarak incele.
- Ödeme başarılıysa ödeme durumunu geriye çekme; fulfillment hatasını ayrı kayıt olarak çöz.
- Aynı callback tekrar geldiyse idempotency nedeniyle ikinci entitlement/sipariş üretmediğini doğrula.
- Aktivasyon bağlantısını yalnız PAID ve henüz hesaba bağlanmamış sipariş için yeniden üret.
- Manuel müdahaleyi admin audit log'a kaydet.

## P0 eskalasyon
- Müşteriden para alındı fakat 15 dakika içinde sipariş/entitlement görünmüyor: P0.
- Aynı ödeme birden çok sipariş veya entitlement oluşturdu: P0.
- Production callback erişilemiyor: P0.
- Production secret sızıntısı şüphesi: derhal ilgili secret'ı rotate et ve deployment'ı durdur.

## Ödeme mutabakat ekranı

Yönetim panelindeki **Ödeme Mutabakatı** sekmesi ödeme ve fulfillment durumlarını tek kuyrukta karşılaştırır. Aşağıdaki durumlar P0 inceleme gerektirir:

- `PAID_ORDER_WITHOUT_PAID_ATTEMPT`: Sipariş PAID görünürken doğrulanmış PAID payment attempt yoktur.
- `PAID_ATTEMPT_ORDER_NOT_PAID`: Sağlayıcı sonucu PAID iken sipariş PAID değildir.
- `FULFILLMENT_REVIEW_REQUIRED`: Ödeme alınmıştır ancak entitlement/yenileme/kurumsal kapasite fulfillment sürecinde açık kayıt vardır.
- `AUTHENTICATED_ORDER_NOT_CLAIMED`: Hesaba bağlı, ödenmiş siparişin activation claim işlemi tamamlanmamıştır.

Bir fulfillment issue yalnızca gerçek neden düzeltildikten sonra çözülmüş olarak işaretlenir. Çözüm notu zorunludur ve işlem `admin_audit_log` içine yazılır. Bir ödeme mutabakat kaydını kapatmak, ödeme durumunu değiştirmez ve ikinci kez tahsilat başlatmaz.
