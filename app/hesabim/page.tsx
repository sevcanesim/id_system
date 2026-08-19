"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { resolveAccountDestination } from "../../lib/auth/account-router";
import { LoadingState } from "../components/ui/States";

/**
 * Hesabım için tek karar noktası.
 *
 * Yönetim yetkisi olan aktif bir şirket üyeliği varsa kurumsal panel açılır.
 * Aksi halde bireysel kart alanına gidilir. Bu sayede header'ın bulunduğu
 * sayfaya göre yanlış hesap türüne yönlenme problemi ortadan kalkar.
 *
 * Bu sayfa middleware.PROTECTED_PAGES listesinde değil (kasıtlı: karar
 * mantığı oturuma bağlı ve middleware'de tekrarlanmasın diye burada), bu
 * yüzden erişim tamamen client-side. Önceki sürümde bu geçiş süresince
 * `null` render ediliyordu — yavaş bağlantıda kısa bir boş sayfa flaşı
 * oluyordu ve kurumsal-üyelik kontrolü başarısız olursa hata sessizce
 * yutuluyordu. Artık görünür bir yükleme durumu var ve hata konsola
 * loglanıyor (kullanıcıyı kilitlemeden bireysel alana düşmeye devam ediyor).
 */
export default function AccountRouterPage() {
  const router = useRouter();
  const [failedSilently, setFailedSilently] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const destination = await resolveAccountDestination(supabase, {
        onOrganizationCheckError: (error) => {
          // Kurumsal kontrol geçici olarak başarısızsa kullanıcıyı kilitleme;
          // bireysel alan kendi veri kontrollerini ayrıca yapıyor. Yine de
          // artık sessizce yutmak yerine konsola işaretliyoruz.
          console.error("hesabim: organizasyon üyeliği kontrolü başarısız oldu, bireysel alana düşülüyor", error);
          if (!cancelled) setFailedSilently(true);
        },
      });

      if (!cancelled) router.replace(destination);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="account-loading">
      <LoadingState label={failedSilently ? "Hesabınıza yönlendiriliyorsunuz…" : "Hesabınız hazırlanıyor…"} />
    </div>
  );
}
