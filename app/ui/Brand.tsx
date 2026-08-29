import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`yi-brand${compact ? " yi-brand--compact" : ""}`} aria-label="Yenomi ID ana sayfa">
      <span className="yi-brand__mark">
        <Image
          src="/images/yenomilabs-mark-transparent.png"
          alt=""
          width={compact ? 46 : 58}
          height={compact ? 46 : 58}
          sizes={compact ? "46px" : "(max-width: 760px) 46px, 58px"}
          priority
        />
      </span>
      <span className="yi-brand__lockup">
        <strong>YENOMI ID</strong>
        <small>DİJİTAL KARTVİZİT</small>
      </span>
    </Link>
  );
}
