import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bireysel NFC ve Premium Kartvizit",
  description: "Bireysel NFC ile profesyonel paylaşım; Bireysel Premium ile canlı profil, bağlantı yönetimi ve takip araçları.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
