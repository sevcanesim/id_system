import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`yi-brand${compact ? " yi-brand--compact" : ""}`} aria-label="Yenomi Labs ana sayfa">
      <span className="yi-brand__mark">
        <Image
          src="/images/yenomilabs-mark-transparent.png"
          alt=""
          width={compact ? 40 : 64}
          height={compact ? 40 : 64}
          sizes={compact ? "40px" : "(max-width: 760px) 52px, 64px"}
          priority
        />
      </span>
      {compact ? <strong>Yenomi Labs</strong> : null}
    </Link>
  );
}
