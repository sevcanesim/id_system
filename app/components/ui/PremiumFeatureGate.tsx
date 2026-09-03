import Link from "next/link";
import { Icon } from "../../icons";
import styles from "./PremiumFeatureGate.module.css";

export default function PremiumFeatureGate({ feature }: { feature: string }) {
  return (
    <section className={styles.gate} aria-labelledby="premium-feature-title">
      <span className={styles.icon} aria-hidden="true"><Icon name="lock" /></span>
      <span className={styles.eyebrow}>PREMİUM ÖZELLİK</span>
      <h2 id="premium-feature-title">{feature}</h2>
      <p>Bu alanı görüntüleyebilmeniz için Premium yükseltmesi yapmalısınız.</p>
      <Link className="yi-btn yi-btn--primary" href="/yenile">Premium’a yükselt</Link>
    </section>
  );
}
