import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`yi-brand${compact ? " yi-brand--compact" : ""}`} aria-label="Yenomi Labs ana sayfa">
      <Image
        src="/images/yenomilabs-mark.webp"
        alt=""
        width={compact ? 40 : 72}
        height={compact ? 40 : 72}
        sizes={compact ? "40px" : "(max-width: 760px) 56px, 72px"}
        priority
      />
      <span>
        {compact ? <strong>Yenomi Labs</strong> : <small>Yenomi Labs ürünü</small>}
      </span>
    </Link>
  );
}
