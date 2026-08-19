import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dijital Kartvizit",
  description: "Bireysel NFC + QR dijital kartvizit. Kurumsal ekip çözümü ayrı incelenir.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
