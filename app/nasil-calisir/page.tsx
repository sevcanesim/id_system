import type { Metadata } from "next";
import { HowItWorksBoard } from "./HowItWorksBoard";

export const metadata: Metadata = {
  title: "Nasıl Çalışır — Yenomi ID",
  description: "Kartı yaklaştır, güncel profil açılsın. Uygulama yok. Unvanın değişince baskı yok; kaybolursa kapatırsın.",
};

export default function HowItWorksPage() {
  return <HowItWorksBoard />;
}
