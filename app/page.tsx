import type { Metadata } from "next";
import { HeroSection } from "./_home/HeroSection";
import { ProofSection } from "./_home/ProofSection";
import { PackageMatrixSection } from "./_home/PackageMatrixSection";
import { JourneySection } from "./_home/JourneySection";
import { ComparisonSection } from "./_home/ComparisonSection";
import { FaqSection } from "./_home/FaqSection";
import { FinalCtaSection } from "./_home/FinalCtaSection";
import { MobileStickyCta } from "./_home/MobileStickyCta";

export const metadata: Metadata = {
  title: "Yenomi ID | Dijital Kimliğiniz Her Tanışmada Hazır",
  description:
    "NFC + QR kartvizit, canlı dijital kimlik ve bağlantı yönetimi. Kartınız aynı kalır; profesyonel kimliğiniz her zaman güncel kalır.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="home-mockup home-premium home-premium--hero-v2">
      <main id="main-content">
        <HeroSection />
        <ProofSection />
        <PackageMatrixSection />
        <JourneySection />
        <ComparisonSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <MobileStickyCta />
    </div>
  );
}
