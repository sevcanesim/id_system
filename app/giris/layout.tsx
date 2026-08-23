import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Giriş Yap", description: "Yenomi ID hesabınıza giriş yapın veya hesabınızı oluşturun." };
export default function Layout({children}:{children:React.ReactNode}){return children;}
