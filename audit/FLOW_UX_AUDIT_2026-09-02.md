# Yenomi ID — Akış / UX Denetimi (2026-09-02)

## Kapsam ve yöntem

Bu denetim, Yenomi ID projesinin (`id_system`) uçtan uca kullanıcı akışlarını kod seviyesinde takip ederek yapıldı: ziyaretçinin ürün seçip satın almasından ödeme sonrası aktivasyona, kartvizit oluşturma sihirbazından bireysel/kurumsal panellere, herkese açık kartvizit görüntülemeden kart kurtarmaya kadar. Yöntem otomatik tarama değil, gerçek sayfa/route dosyalarının (`app/**/page.tsx`, ilgili client bileşenleri, `lib/**`) satır satır okunması ve ekranlar arası geçişlerin (yönlendirmeler, CTA'lar, hata durumları) manuel olarak izlenmesidir.

Proje zaten çok sayıda önceki denetim turu geçirmiş (`audit/`, `docs/product-engineering/`, `NEXT_TASKS.md`) ve kod genel olarak olgun, iyi yapılandırılmış durumda — TODO/FIXME kalıntısı yok, çoğu ekranda hata mesajları ve retry mekanizmaları düşünülmüş. Bu denetim, önceki turlarda kapsanmamış veya kısmen kapsanmış **akış (flow)** sorunlarına odaklandı: bir ekrandan diğerine geçişte bağlamın kaybolduğu, kullanıcının "sıkıştığı" veya CTA'ların vaat ettiğini teslim etmediği noktalar.

Aşağıdaki bulgular önem sırasına göre listelenmiştir. Her biri dosya/satır referansıyla doğrulanmıştır.

## Özet tablo

| # | Bulgu | Konum | Öncelik |
|---|---|---|---|
| 1 | "Siparişlerim" ekranında ödeme bekleyen siparişler için ödemeyi tamamlama aksiyonu yok | `app/siparislerim/page.tsx` | Yüksek |
| 2 | Süresi dolmuş/pasif herkese açık kartvizit sayfalarında yenileme veya destek CTA'sı yok | `app/p/[publicId]/page.tsx`, `app/c/[cardCode]/page.tsx`, `app/[slug]/page.tsx` | Yüksek |
| 3 | Aktivasyonda hesap oluşturma başarılı ama otomatik giriş başarısız olursa sessizce yanlış yere yönlendiriliyor | `app/aktivasyon/ActivationClient.tsx` | Yüksek |
| 4 | Kart Stüdyosu'nda (CardWizard) herhangi bir geçici hata, düzenleme bağlamını kaybettirip kullanıcıyı `next` parametresiz girişe atıyor | `app/olustur/CardWizard.tsx` | Yüksek |
| 5 | Checkout'ta pencere odağı kaybı (blur) tüm formu — sadece TCKN'yi değil — gizliyor | `app/checkout/page.tsx` | Orta |
| 6 | Misafir checkout: sepete dönüp düzenleme linki yok, sayfadan ayrılınca girilen bilgiler siliniyor | `app/checkout/page.tsx`, `app/ui/SiteHeader.tsx`, `lib/commerce/checkout-session-bootstrap.ts` | Orta |
| 7 | Aktivasyon sayfasında iki görsel olarak ayrı e-posta alanı aynı state'i paylaşıyor | `app/aktivasyon/ActivationClient.tsx` | Düşük |

---

## 1) Siparişlerim: ödeme bekleyen siparişte "öde" düğmesi yok

`app/siparislerim/page.tsx` içinde her sipariş durumu (`AWAITING_PAYMENT`, `PAID`, `PREPARING`…) bir rozet ve açıklama metniyle gösteriliyor, ama kartın içinde hiçbir aksiyon butonu yok — sadece bilgi. `AWAITING_PAYMENT` durumundaki bir sipariş için kullanıcıya gösterilen tek şey "Ödeme tamamlandığında sipariş hazırlık sürecine alınır." metni; ödemeyi tamamlamak için tıklanacak hiçbir şey yok.

Bu, uygulamanın kendi yönlendirmeleriyle çelişiyor: `app/odeme/basarisiz/page.tsx` kullanıcıya "Kartından çekim olmadıysa ücret alınmaz... Siparişlerimi Gör" seçeneğini sunuyor; `app/odeme/basarili/OrderResultGate.tsx`'in `invalid` durumu da "Çekim olduysa siparişlerimden durumu gör; olmadıysa aynı siparişi yeniden dene" diyerek kullanıcıyı Siparişlerim'e yönlendiriyor. Ama oraya giden kullanıcı, sipariş numarasını ve "ödeme bekleniyor" rozetini görür, sonrasında yapabileceği hiçbir şey yoktur.

Pratikte kurtarma yolu, kullanıcının aynı ürünü tekrar sepete atıp `/checkout`'a gitmesi ve orada `lookupPendingCheckoutOrder()` mekanizmasının (tarayıcıdaki localStorage/cookie üzerinden) eski siparişi tanıyıp `retryOrderId` ile eşlemesine bağlı — ki bu da yalnız aynı cihaz/tarayıcıda çalışır. Başka bir cihazdan giriş yapan (örn. telefondan sipariş verip masaüstünden kontrol eden) bir kullanıcı için bu otomatik eşleşme de yoktur ve sipariş fiilen ödenemez hâlde kalır.

**Öneri:** `AWAITING_PAYMENT` (ve muhtemelen `DRAFT`) durumundaki sipariş kartına, o siparişin `orderId`'sini taşıyan bir "Ödemeyi Tamamla" düğmesi eklenmeli; bu düğme `/checkout?resume=...` akışına (zaten var olan `checkout/resume` token mekanizmasına) veya doğrudan `/api/payments/iyzico/checkout` yeniden başlatmaya bağlanmalı.

## 2) Süresi dolmuş/pasif kartvizit sayfalarında hiçbir çıkış yolu yok

Bu, üç ayrı public route'ta aynı şekilde tekrarlanan sistemik bir bulgu:

- `app/p/[publicId]/page.tsx` → `PublicCardUnavailable` bileşeni ("Bu profil şu anda aktif değil.")
- `app/c/[cardCode]/page.tsx` → `CardState` bileşeni ("Bu Yenomi kartı kullanım dışıdır." / "Bu Yenomi profili şu anda aktif değildir.")
- `app/[slug]/page.tsx` → aynı `isCardProfileServiceActive` kontrolü

Üçünde de hizmet süresi dolmuş (`isCardProfileServiceActive` false), askıya alınmış (`SUSPENDED`) veya iade edilmiş (`REFUNDED`) bir profile denk gelindiğinde kullanıcıya gösterilen tek aksiyon `<a href="/">Ana sayfaya dön</a>`dür. Ne "Hesabına giriş yap ve yenile" ne "Destek" ne de sebep açıklaması (süre mi doldu, ödeme mi sorunlu, hesap mı askıya alındı) var — hepsi aynı belirsiz "şu anda aktif değil" mesajına düşüyor.

Bunun önemi büyük: bu sayfaya gelen kişi genelde kartın **sahibinin kendisi**dir — NFC kartını okutup kendi profilinin neden açılmadığını kontrol ediyordur, ya da kartı birine gösterip mahcup oluyordur. Bu tam olarak yenileme (renewal) dönüşümü için en doğru andır, ama üründe zaten var olan `/yenile` sayfası (`app/yenile/page.tsx`, giriş yapmış kullanıcı panelinde) buraya hiç bağlanmamış. Kullanıcı, kartı çalışmayan bir NFC kartından `/yenile`'ye kendi başına ancak "girişe git → hesabım → hizmet & yenileme" zincirini bilerek ulaşabilir; sayfanın kendisi bu yolu göstermiyor.

**Öneri:** Üç sayfada da durum bazlı, farklılaştırılmış mesaj + aksiyon eklenmeli: süresi dolmuşsa "Hizmetini yenile" → `/yenile` (veya oturum yoksa `/giris?next=%2Fyenile`), askıya alınmışsa "Destek ile iletişime geç" → `/destek`. En azından tek bir genel "Hesabıma giriş yap" bağlantısı bile mevcut duruma göre büyük iyileştirme olur.

## 3) Aktivasyonda hesap oluşturuldu ama otomatik giriş sessizce başarısız olabiliyor

`app/aktivasyon/ActivationClient.tsx` içindeki `submit()` fonksiyonunda, "Yeni hesap" modunda önce `/api/commerce/activate` çağrısıyla sunucu tarafında hesap oluşturuluyor (bu adım `admin.auth.admin.createUser` ile **service_role** üzerinden yapılıyor, tarayıcıda oturum açmıyor — bkz. `app/api/commerce/activate/route.ts`). Ardından istemci tarafında ayrıca `passwordLogin({ email, password })` çağrılarak asıl tarayıcı oturumu kuruluyor:

```
const signedIn = await passwordLogin({ email, password });
if (signedIn.ok) {
  ...
  if (session?.user?.id) setCartOwner(session.user.id, { claimGuest: true });
}
```

Dikkat: `signedIn.ok` false dönerse (geçici ağ hatası, Supabase auth rate-limit vb.) kod bunu **hiçbir şekilde ele almıyor** — hata fırlatılmıyor, kullanıcıya mesaj gösterilmiyor. Fonksiyon doğrudan devam edip `router.push(corporate ? "/kurumsal/panel" : INDIVIDUAL_POST_PURCHASE_HREF)` çağırıyor. Sonuç: kullanıcı oturumu olmadan korumalı bir rotaya gönderilir, muhtemelen oradaki auth guard tarafından tekrar `/giris`'e sekilir — üstelik hesabı **zaten oluşturulmuş** olduğundan, "Yeni hesap" sekmesinden tekrar denerse "Bu e-posta zaten kayıtlı" hatası alır ve "Mevcut hesabım" sekmesine geçmesi gerektiğini kendi başına çözmesi gerekir. Ekranda bu geçişi açıklayan hiçbir mesaj yok.

**Öneri:** `passwordLogin` başarısız olduğunda kullanıcıya net bir mesaj gösterilmeli ("Hesabın oluşturuldu ama giriş yapılamadı; lütfen 'Mevcut hesabım' ile giriş yap") ve yönlendirme yapılmamalı.

## 4) CardWizard: geçici bir hata bile düzenleme bağlamını ve girilmiş verileri kaybettiriyor

`app/olustur/CardWizard.tsx`'in başlangıç `useEffect`'i, yetkilendirme + profil + organizasyon kimliği + kota kontrolü gibi birden fazla zincirlenmiş `fetch` çağrısı yapıyor (kullanıcı, oturum, `/api/organizations/mine`, `/api/commerce/entitlements`, `fetchOrganizationIdentity`, `fetchOwnProfiles`, `card_profile_locales` sorgusu…). Bu zincirin **herhangi bir yerinde** atılan bir hata (ağ kesintisi, geçici 500, beklenmeyen JSON) yakalanıp şöyle işleniyor:

```
} catch (err) {
  console.error("CardWizard authorization error:", err);
  setContextDirty(false);
  setAccessState("denied");
  router.replace("/giris?portal=business");
}
```

Bunun iki sorunu var. Birincisi, `portal` parametresi artık ölü kod — `lib/auth/account-router.ts` içindeki yorum bunu açıkça belirtiyor: *"Legacy callers may still pass a portal value. It is intentionally ignored."* `LoginClient` yalnızca `next` parametresini okuyor; burada `next` verilmediği için kullanıcı giriş yaptıktan sonra `/hesabim`'e (genel hesap yönlendiricisine) düşüyor, düzenlemekte olduğu karta değil. Karşılaştırma için: aynı dosyada gerçek "oturum yok" durumunda (satır ~234, ~242) doğru şekilde `router.replace("/giris?next=%2Folustur")` kullanılıyor — yani iki farklı hata yolu tutarsız davranıyor ve daha kötüsü olan (context kaybeden) yol, en sık tetiklenebilecek genel `catch` bloğu.

İkincisi, bu yönlendirme kullanıcının aktif düzenlemesini hiçbir onay istemeden siliyor. Sayfa zaten kayıtsız değişiklikleri korumak için bir mekanizmaya sahip (`useUnsavedChanges` / `guardLinkClick`, `isDirty` state'i) — ama bu mekanizma yalnızca kullanıcının kendi tıkladığı linkler için çalışıyor; `catch` bloğundaki otomatik `router.replace` bu korumayı hiç görmüyor. Yani tamamen oturum açık, geçerli bir kullanıcı, sırf bir API çağrısı geçici olarak başarısız olduğu için düzenlemekte olduğu kartvizitten atılıyor ve girdiği bilgiler (henüz kaydetmediyse) kayboluyor — hiçbir açıklama olmadan, sanki oturumu bitmiş gibi giriş ekranına düşüyor.

**Öneri:** Bu genel `catch` bloğu "oturum geçersiz" ile "geçici hata" durumlarını ayırmalı. Gerçek 401/oturum hatası dışındaki durumlarda kullanıcıyı girişe atmak yerine sayfa içinde bir hata + "Tekrar dene" state'i gösterilmeli (tıpkı `app/hesabim/page.tsx`'in kendi hata durumunda yaptığı gibi). Girişe yönlendirme gerekiyorsa da mutlaka mevcut `next`'i (mevcut URL/parametreleri) taşımalı.

## 5) Checkout'ta pencere odağı kaybı (blur) tüm formu gizliyor, sadece kimlik numarasını değil

`audit/SYSTEM_HARDENING_AUDIT_V25.9.4.md` (satır 75, 98, 182), checkout'taki gizlilik maskesinin amacını net biçimde tanımlıyor: iOS uygulama geçiş ekranında (app switcher) TCKN'nin ekran görüntüsünde görünmesini engellemek, `visibilityState !== "visible"` tetikleyicisiyle. Kodda bu doğru uygulanmış: `document.visibilitychange` olayı hem maskeyi açıyor hem TCKN alanını temizliyor.

Ancak `app/checkout/page.tsx` içinde ayrıca bağımsız bir `window` `blur`/`focus` dinleyicisi var:

```
const onBlur = () => setPrivacyMask(true);
const onFocus = () => { if (document.visibilityState === "visible") setPrivacyMask(false); };
```

Bu, sekme/uygulama gerçekten arka plana geçmese bile — örneğin kullanıcı adres çubuğuna tıkladığında, tarayıcı geliştirici araçlarını açtığında, bir bildirim penceresi üstte belirdiğinde, masaüstünde başka bir pencereye Alt+Tab yaptığında — tüm ödeme formunu ("Ödeme bilgileri gizlendi. Bu sekmeye döndüğünüzde işlem ekranı yeniden görünür. T.C. kimlik numarası güvenlik için temizlendi.") kaplıyor. Belgelenen tehdit modeli (iOS ekran görüntüsü) yalnız `visibilitychange`'i gerektiriyor; salt `blur` masaüstünde çok daha sık tetiklenen, güvenlik açısından karşılığı olmayan bir olay ve mesajı da yanıltıcı ("kimlik numarası temizlendi" her blur'da değil, yalnız gerçek visibility-hide'da doğru).

**Öneri:** `blur` tabanlı maskeleme kaldırılmalı veya en azından `visibilityState !== "visible"` ile birlikte tetiklenecek şekilde daraltılmalı; masaüstünde salt pencere odağı kaybında formun tamamen kaybolmasına gerek yok.

## 6) Misafir checkout: sepete dönüş linki yok, ayrılınca form verisi siliniyor

`app/ui/SiteHeader.tsx`'te `checkout` varyantı için `showCart = !isCheckout && !isAuth` — yani `/checkout` sayfasında sepet ikonu/linki, ana navigasyon ve marka dışında hiçbir gezinme öğesi gösterilmiyor (dikkat dağıtmayı azaltmak için bilinçli bir tercih olabilir, ama bunun bedeli var). `app/checkout/page.tsx` içinde de sepete dönmek için herhangi bir link yok. Kullanıcı adet/ürün değiştirmek isterse tek seçeneği logo → ana sayfa → sepet ikonu → `/sepet` zinciri (ya da tarayıcı geri tuşu).

Bu, misafir (giriş yapmamış) kullanıcılar için ciddi bir veri kaybına yol açıyor: `lib/commerce/checkout-session-bootstrap.ts`'e göre form ön-doldurma yalnızca oturum açmış kullanıcılar için yapılıyor (`sessionCheckoutPrefill` + son ödenmiş sipariş). Misafir kullanıcının girdiği ad-soyad, telefon, adres, şehir/ilçe, TCKN gibi tüm bilgiler yalnızca `CardWizard` benzeri bir React state'te tutuluyor, hiçbir yerde (localStorage dahil) kalıcı değil. Yani sepeti düzenlemek için `/checkout`'tan ayrılan bir misafir, geri döndüğünde tüm formu — birkaç adımlık accordion'u (Alıcı Bilgileri → Teslimat → Onay) baştan doldurmak zorunda kalıyor.

**Öneri:** Checkout header'ına (en azından `isCheckout` durumunda dahi) sepete dönüş için düşük vurgulu bir link eklenmeli, ya da checkout accordion'ının kendi içinde "Sepeti düzenle" bağlantısı olmalı. Alternatif olarak misafir form verisi de (TCKN hariç, o zaten güvenlik gereği temizleniyor) oturum süresince `sessionStorage`'da saklanabilir.

## 7) Aktivasyon sayfasında iki ayrı görünen e-posta alanı aslında aynı state

`app/aktivasyon/ActivationClient.tsx`'te hem üstteki token formundaki "E-posta" alanı hem de alttaki "Bağlantın gelmedi mi?" bölümündeki "E-posta" alanı aynı `email`/`setEmail` state'ini paylaşıyor. Aynı kişinin e-postası olduğu için mantıken sorun değil, ama iki farklı, görsel olarak ayrı kutu olarak sunuldukları için kullanıcı ikisini bağımsız sanabilir: alt formda yazdığı e-posta, üstteki hesap oluşturma/giriş formundaki alanı da sessizce değiştiriyor (ve tersi). Küçük ama kafa karıştırıcı bir detay.

**Öneri:** İki alan gerçekten aynı değeri paylaşacaksa görsel olarak da bağlı olduklarını belli edecek küçük bir not eklenebilir ("E-postan otomatik olarak yukarıdaki alanla eşleşir") ya da alanlar birbirinden bağımsız state'lere ayrılabilir.

---

## Kapsam dışı bırakılanlar

Bu tur, dönüşüm hunisi (satın alma → ödeme → aktivasyon), kimlik/yönlendirme (`giris`, `hesabim`, portal-guard), kartvizit oluşturma sihirbazı, kurumsal davet girişi ve herkese açık kartvizit/kurtarma sayfalarına odaklandı. Kurumsal panelin iç sekmeleri (Overview, Roller, Şablonlar, Analitik, Etkinlikler/Toplantılar), admin/operasyon paneli ve responsive/görsel QA (`RESPONSIVE_MASTER_ROADMAP_V2.md`'de zaten ayrı bir iz sürülüyor) bu turda kod seviyesinde derinlemesine incelenmedi; kurumsal panelin çalışan davet/CSV toplu davet akışı hızlı bir taramadan geçti ve NEXT_TASKS.md'de belirtilen düzeltmelerle (davet yeniden gönderme, e-posta hatası ayrıştırma) tutarlı bulundu, yeni bir sorun tespit edilmedi.
