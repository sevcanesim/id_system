import type { Metadata } from "next";
import { HowItWorksBoard } from "./HowItWorksBoard";

export const metadata: Metadata = {
  title: "Nasıl Çalışır — Yenomi ID Premium",
  description: "NFC + QR kartını paylaş, kişileri yönet, toplantı ve sunumlarını bağla, Network Mail ile tanışma sonrasını takip et.",
};

export default function HowItWorksPage() {
  return <HowItWorksBoard />;
}
