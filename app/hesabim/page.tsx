"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { resolveAccountDestination } from "../../lib/auth/account-router";
import { LoadingState } from "../components/ui/States";

export default function AccountRouterPage() {
  const router = useRouter();
  const [failedSilently, setFailedSilently] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const destination = await resolveAccountDestination(supabase, {
        onOrganizationCheckError: (error) => {
          console.error("hesabim: organizasyon üyeliği kontrolü başarısız oldu, bireysel alana düşülüyor", error instanceof Error ? error.message : "UNKNOWN");
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
