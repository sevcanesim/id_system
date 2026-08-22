import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`yi-brand${compact ? " yi-brand--compact" : ""}`} aria-label="Yenomi ID ana sayfa">
      <span className="yi-brand__mark">
        <Image
          src="/images/yenomilabs-mark-transparent.png"
          alt=""
          width={compact ? 52 : 72}
          height={compact ? 52 : 72}
          sizes={compact ? "52px" : "(max-width: 620px) 64px, 72px"}
          priority
        />
      </span>
    </Link>
  );
}
