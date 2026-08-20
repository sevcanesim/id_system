import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`yi-brand${compact ? " yi-brand--compact" : ""}`} aria-label="Yenomi ID ana sayfa">
      <span className="yi-brand__mark">
        <Image
          src="/images/yenomilabs-mark-transparent.png"
          alt=""
          width={compact ? 44 : 56}
          height={compact ? 44 : 56}
          sizes={compact ? "44px" : "(max-width: 620px) 52px, 56px"}
          priority
        />
      </span>
    </Link>
  );
}
