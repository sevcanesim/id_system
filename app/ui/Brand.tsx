import Link from "next/link";
import Image from "next/image";

export function Brand({compact=false}:{compact?:boolean}) {
  return <Link href="/" className={`yi-brand${compact ? " yi-brand--compact" : ""}`} aria-label="Yenomi ID ana sayfa">
    <Image src="/images/yenomilabs-mark.webp" alt="" width={32} height={32} sizes="32px" priority />
    <span><strong>Yenomi ID</strong>{!compact && <small>YENOMI LABS ÜRÜNÜ</small>}</span>
  </Link>;
}
