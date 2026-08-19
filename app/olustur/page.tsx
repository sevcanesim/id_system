import type { Metadata } from "next";

import { Suspense } from "react";
import CardWizard from "./CardWizard";

export const metadata: Metadata = {
  title: "Dijital Kartvizit Oluştur | Yenomilabs",
  description: "Kendi QR ve NFC uyumlu dijital kartvizitini birkaç adımda oluştur.",
};

export default function CreatePage() {
  return <Suspense fallback={null}><CardWizard /></Suspense>;
}
