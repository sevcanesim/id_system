import type { Metadata } from "next";
import { HowItWorksBoard } from "./HowItWorksBoard";

export const metadata: Metadata = {
  title: "Bireysel Premium Nasıl Çalışır",
  description: "NFC + QR kartını paylaş, canlı profilini güncel tut, bağlantılarını yönet ve Network Mail ile tanışma sonrasını takipte kal.",
};

export default function HowItWorksPage() {
  return <HowItWorksBoard />;
}
