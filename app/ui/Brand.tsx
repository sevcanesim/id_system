import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`yi-brand${compact ? " yi-brand--compact" : ""}`} aria-label="Yenomi ID ana sayfa">
      <span className="yi-brand__mark">
        <Image
          src="/images/yenomilabs-mark-transparent.png"
          alt=""
          width={compact ? 40 : 48}
          height={compact ? 40 : 48}
          sizes={compact ? "40px" : "(max-width: 760px) 40px, 48px"}
          priority
        />
      </span>
      <span>
        <strong>Yenomi ID</strong>
        {!compact ? <small>YENOMI LABS ÜRÜNÜ</small> : null}
      </span>
    </Link>
  );
}
