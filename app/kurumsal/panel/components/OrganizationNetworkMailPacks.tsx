"use client";

import AddToCartButton from "../../../components/AddToCartButton";
import { Icon } from "../../../icons";
import { formatTryFromKurus, NFC_PRODUCT } from "../../../../lib/config/product";
import { NETWORK_MAIL_CREDIT_PACKS } from "../../../../lib/commerce/packages";
import styles from "./OrganizationNetworkMailPacks.module.css";

type Props = {
  organizationId: string;
  purchaseAllowed?: boolean;
};

/**
 * Network Mail credits always belong to one organization. The organization id
 * travels with the cart line and is re-authorized on the checkout server;
 * it is never inferred from the buyer's personal account.
 */
export default function OrganizationNetworkMailPacks({ organizationId, purchaseAllowed = true }: Props) {
  return (
    <section className={styles.section} aria-labelledby="organization-network-mail-packs-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}><Icon name="mail" /> ŞİRKET NETWORK MAIL</span>
          <h3 id="organization-network-mail-packs-title">Takip kapasitenizi şirketiniz için yükseltin.</h3>
          <p>Her kredi şirket Network Mail bakiyesine eklenir. Kredi yalnız bire bir takip e-postalarında kullanılır; toplu kampanya gönderiminde kullanılmaz.</p>
        </div>
        <span className={styles.scope}><Icon name="building" /> Şirket bakiyesi</span>
      </header>

      <div className={styles.grid}>
        {NETWORK_MAIL_CREDIT_PACKS.map((pack) => (
          <article className={styles.pack} key={pack.sku}>
            <span className={styles.packKicker}>NETWORK MAIL</span>
            <strong>{pack.credits.toLocaleString("tr-TR")} kredi</strong>
            <p>1 kredi, 1 alıcıya gönderilen takip e-postasıdır.</p>
            <div className={styles.action}>
              <span>{formatTryFromKurus(pack.priceKurus)}</span>
              {purchaseAllowed ? (
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={pack.sku}
                  kind="BUSINESS_CARD"
                  name={`Şirket Network Mail — ${pack.credits.toLocaleString("tr-TR")} kredi`}
                  unitPriceKurus={pack.priceKurus}
                  configuration={{ organizationId, creditScope: "ORGANIZATION" }}
                  label="Şirkete ekle"
                  className={styles.addButton}
                />
              ) : <span className={styles.restricted}>Satın alma yetkisi Şirket Sahibinde</span>}
            </div>
          </article>
        ))}
      </div>
      <p className={styles.notice}><Icon name="lock" /> Satın alma, ödeme sonrası otomatik olarak bu şirketin Network Mail bakiyesine yazılır.</p>
    </section>
  );
}
