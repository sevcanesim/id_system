import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ürünler | Yenomi ID",
  description: "Yenomi ID NFC kartını ve kurumsal çözümleri karşılaştırın; size uygun dijital kimlik deneyimini seçin.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
