"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type NfcPackageId = "individual" | "premium";

type NfcPackageContextValue = {
  packageId: NfcPackageId;
  setPackageId: (value: NfcPackageId) => void;
};

const NfcPackageContext = createContext<NfcPackageContextValue | null>(null);

export function NfcPackageProvider({
  initialPackage,
  children,
}: {
  initialPackage: NfcPackageId;
  children: React.ReactNode;
}) {
  const [packageId, setPackageId] = useState<NfcPackageId>(initialPackage);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setPackage = useCallback((nextPackage: NfcPackageId) => {
    setPackageId(nextPackage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("paket", nextPackage);
    router.replace(pathname + "?" + params.toString(), { scroll: false });
  }, [pathname, router, searchParams]);
  const value = useMemo(() => ({ packageId, setPackageId: setPackage }), [packageId, setPackage]);

  return <NfcPackageContext.Provider value={value}>{children}</NfcPackageContext.Provider>;
}

export function useNfcPackage() {
  const context = useContext(NfcPackageContext);
  if (!context) throw new Error("useNfcPackage must be used within NfcPackageProvider");
  return context;
}
