"use client";

import { createContext, useContext, useMemo, useState } from "react";

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
  const value = useMemo(() => ({ packageId, setPackageId }), [packageId]);

  return <NfcPackageContext.Provider value={value}>{children}</NfcPackageContext.Provider>;
}

export function useNfcPackage() {
  const context = useContext(NfcPackageContext);
  if (!context) throw new Error("useNfcPackage must be used within NfcPackageProvider");
  return context;
}
