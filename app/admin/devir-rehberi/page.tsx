"use client";

import Link from "next/link";
import styles from "./HandoverGuide.module.css";

export default function AdminHandoverGuidePage() {
  return <main className={styles.page} id="main-content">
    <section className={styles.shell}>
      <div className={styles.toolbar}>
        <div><span className={styles.kicker}>SUPER ADMIN DEVİR DOKÜMANI</span><h1>Yenomi ID Kullanım ve Devir Rehberi</h1><p>Yeni yöneticiye sistemin nasıl çalıştığını, hangi ekranın ne için kullanıldığını ve kritik güvenlik kurallarını aktarmak için hazırlanmıştır.</p></div>
        <div className={styles.actions}><Link href="/admin">Satış merkezine dön</Link><button type="button" onClick={() => window.print()}>PDF Olarak Kaydet</button></div>
      </div>

      <div className={styles.warning}><strong>Bu dokümana gizli bilgi yazmayın.</strong><span>Şifre, Supabase service-role key, iyzico anahtarı, e-posta parolası, Google Authenticator QR kodu/TOTP secret'ı ve kişisel erişim tokenları PDF'e eklenmemelidir.</span></div>

      <section className={styles.section}><h2>1. Super Admin erişimi</h2><p>Super Admin için ayrı bir herkese açık giriş ekranı yoktur. Yönetici normal giriş ekranından oturum açar; sistem kullanıcının <code>admin_users</code> kaydını kontrol eder. Super Admin API işlemleri Google Authenticator ile AAL2 doğrulaması yapılmadan çalışmaz.</p><div className={styles.steps}><div><b>1</b><span><strong>/giris</strong><small>Normal kullanıcı girişi yapılır.</small></span></div><div><b>2</b><span><strong>/admin/security</strong><small>Google Authenticator kodu ile ikinci faktör doğrulanır.</small></span></div><div><b>3</b><span><strong>/admin</strong><small>Satış ve hesap operasyonları yönetilir.</small></span></div></div></section>

      <section className={styles.section}><h2>2. Satış Merkezi — /admin</h2><p>Bireysel ve kurumsal tüm satın almalar aynı ticari görünümde izlenir. Sipariş, müşteri, ürün, ödeme, aktivasyon ve fulfillment durumları birbirinden ayrı değerlendirilmelidir.</p><table><thead><tr><th>Alan</th><th>Ne için kullanılır?</th></tr></thead><tbody><tr><td>Tüm Satışlar</td><td>Bireysel ve kurumsal siparişlerin tek listede takibi.</td></tr><tr><td>Ödeme Mutabakatı</td><td>iyzico ödeme sonucu ile sipariş/entitlement kayıtlarının tutarlı olup olmadığını kontrol eder.</td></tr><tr><td>Kurumsal Hesaplar</td><td>Şirket tenant'ı, yönetici bağlantısı, kapasite ve abonelik görünümü.</td></tr><tr><td>Filtreler</td><td>Bireysel/kurumsal, ürün tipi, operasyon aşaması ve sipariş durumu ayrımı.</td></tr></tbody></table></section>

      <section className={styles.section}><h2>3. Operasyon Merkezi — /admin/operations</h2><table><thead><tr><th>Sekme</th><th>Görev</th></tr></thead><tbody><tr><td>Baskı & Kargo</td><td>Ödenmiş fiziksel kartın baskı kuyruğu, baskı onayı, kargo firması/takip no ve teslimat aşamaları.</td></tr><tr><td>Network Mail</td><td>Premium kullanıcıların 100 kredi kotasını ve yetkili manuel düzeltmeleri yönetir.</td></tr><tr><td>Lisans Batchleri</td><td>Kurumsal ana paket ve sonradan alınan ek kapasiteleri ayrı satın alma/yenileme dönemleriyle izler.</td></tr><tr><td>Fiyatlandırma</td><td>Aktif ürün ve kurumsal paket fiyatlarını yönetir.</td></tr><tr><td>Audit Log</td><td>Yönetici aksiyonlarının zaman damgalı denetim geçmişini gösterir.</td></tr></tbody></table></section>

      <section className={styles.section}><h2>4. Fiziksel kart iş akışı</h2><div className={styles.flow}><span>Ödeme alındı</span><i>→</i><span>Profil tamamlandı</span><i>→</i><span>PRINT_PENDING</span><i>→</i><span>PRINTING</span><i>→</i><span>SHIPPING_PENDING</span><i>→</i><span>IN_TRANSIT</span><i>→</i><span>OUT_FOR_DELIVERY</span><i>→</i><span>DELIVERED</span></div><p>Profil tamamlanması tek başına ücretsiz kart hakkı oluşturmaz. Baskıya yalnızca mevcut ödenmiş/yetkili fiziksel kart birimi geçebilir.</p></section>

      <section className={styles.section}><h2>5. Bireysel paket mantığı</h2><table><thead><tr><th>Paket/işlem</th><th>Operasyonel not</th></tr></thead><tbody><tr><td>Standard</td><td>1.490 TL temel bireysel ürün. Satın alma zamanı ödeme kaynağından gelir.</td></tr><tr><td>Premium</td><td>Premium hakları ve yıllık 100 Network Mail kredisi içerir.</td></tr><tr><td>Premium yükseltme</td><td>Standard kullanıcının Premium entitlement'a geçişidir; yeni fiziksel kart varsayılmamalıdır.</td></tr><tr><td>Yenileme</td><td>Hizmet dönemi 365 gündür; yenileme fiziksel kart üretimiyle eş anlamlı değildir.</td></tr></tbody></table></section>

      <section className={styles.section}><h2>6. Kurumsal satın alma ve kapasite</h2><p>Kurumsal kapasite tek bir toplam sayaç gibi faturalandırılmaz. Her satın alma bir batch/term olarak korunur. Örneğin 10 kişilik ana paket + daha sonra 5 kişilik kapasite alımı iki farklı satın alma ve iki farklı yenileme tarihidir.</p><ul><li>Batch ID ve kaynak sipariş korunur.</li><li>Başlangıç ve bitiş tarihi batch bazındadır.</li><li>Yenileme bedeli batch bazındadır.</li><li>Toplam kapasite yalnızca kullanım görünümü için birleştirilebilir.</li><li>Otomatik yenileme kaydı oluşturmak otomatik kart çekimi anlamına gelmez; ödeme mandate'i yoksa karttan otomatik tahsilat yapılmaz.</li></ul></section>

      <section className={styles.section}><h2>7. Network Mail</h2><p>Premium bireysel kullanıcı için yıllık kota 100'dür. Kredi yalnızca doğrulanmış başarılı/idempotent gönderim sınırında tüketilmelidir. Başarısız gönderim kredi harcamamalıdır. Super Admin manuel artış/reset yaptığında neden alanı doldurulmalı ve işlem audit log'a yazılmalıdır.</p></section>

      <section className={styles.section}><h2>8. Fiyatlandırma</h2><p>Fiyat değişiklikleri kullanıcı arayüzünde sabit metinlerle çoğaltılmamalıdır. Super Admin fiyatlandırma ekranındaki katalog değerleri kaynak kabul edilir. Değişiklik sonrası checkout, ürün sayfası ve kurumsal plan görünümü birlikte doğrulanmalıdır.</p></section>

      <section className={styles.section}><h2>9. Güvenlik ve erişim devri</h2><ul><li>Eski yöneticinin Super Admin yetkisi devir tamamlanınca kaldırılmalıdır.</li><li>Eski cihazdaki Google Authenticator faktörü kaldırılmalı, yeni yönetici kendi cihazında yeni TOTP faktörü kurmalıdır.</li><li>Şifre/TOTP secret paylaşmak yerine yeni kullanıcıya ayrı kimlik ve ayrı MFA tanımlanmalıdır.</li><li>Supabase, Vercel, GitHub, iyzico, Resend ve alan adı yönetimi için kişiye özel hesap/yetki tercih edilmelidir.</li><li>Service-role key veya production secret'ları mesaj, PDF veya ekran görüntüsüyle paylaşmayın.</li><li>Devir sonunda kritik yönetici işlemleri Audit Log üzerinden kontrol edilmelidir.</li></ul></section>

      <section className={styles.section}><h2>10. Devir kontrol listesi</h2><div className={styles.checklist}><label><input type="checkbox" /> Yeni yöneticinin normal hesabı oluşturuldu</label><label><input type="checkbox" /> Super Admin yetkisi tanımlandı</label><label><input type="checkbox" /> Google Authenticator yeni cihazda kuruldu ve AAL2 doğrulandı</label><label><input type="checkbox" /> Eski yönetici erişimleri kaldırıldı</label><label><input type="checkbox" /> Satış Merkezi ve Operasyon Merkezi birlikte test edildi</label><label><input type="checkbox" /> Baskı/kargo örnek akışı kontrol edildi</label><label><input type="checkbox" /> Kurumsal batch ve yenileme kayıtları kontrol edildi</label><label><input type="checkbox" /> Network Mail kotası ve audit kayıtları kontrol edildi</label><label><input type="checkbox" /> Üretim secret'larının hiçbiri PDF'e eklenmedi</label></div></section>

      <footer className={styles.footer}><span>Yenomi ID — Super Admin Kullanım ve Devir Rehberi</span><span>Bu çıktı operasyonel bilgilendirme dokümanıdır; gizli erişim bilgisi içermez.</span></footer>
    </section>
  </main>;
}
