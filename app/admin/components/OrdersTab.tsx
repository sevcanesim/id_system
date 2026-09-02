import {
  type AudienceFilter, type Order, type OperationsFilter, type OrderStatus, type ProductFilter,
  orderStatusLabels, productLabels, operationsLabels,
  formatDate, money, classifyProduct, orderAudience, orderOperationsState, needsPhysicalFulfillment, attentionLabel,
} from "../../../lib/admin/order-classification";
import styles from "../AdminSales.module.css";

/**
 * "Satış Kuyruğu" sekmesi. app/admin/page.tsx'ten çıkarıldı; davranış
 * birebir korunur — tüm state (filtreler dahil) ve veri yükleme parent'ta
 * kalır, bu bileşen yalnızca sunum katmanıdır. Sipariş detay çekmecesi
 * (OrderDetailDrawer) tab değişse de açık kalabildiği için ayrı tutulur.
 */
export default function OrdersTab({
  stats, visible, message,
  search, setSearch, audienceFilter, setAudienceFilter, productFilter, setProductFilter,
  operationsFilter, setOperationsFilter, statusFilter, setStatusFilter,
  onSelectOrder,
}: {
  stats: { attention: number; activation: number; fulfillment: number; revenue: number };
  visible: Order[];
  message: string;
  search: string; setSearch: (value: string) => void;
  audienceFilter: AudienceFilter; setAudienceFilter: (value: AudienceFilter) => void;
  productFilter: ProductFilter; setProductFilter: (value: ProductFilter) => void;
  operationsFilter: OperationsFilter; setOperationsFilter: (value: OperationsFilter) => void;
  statusFilter: "ALL" | OrderStatus; setStatusFilter: (value: "ALL" | OrderStatus) => void;
  onSelectOrder: (orderId: string) => void;
}) {
  return <>
    <div className={styles.stats}><div className={styles.stat}><small>Aksiyon bekleyen</small><strong>{stats.attention}</strong></div><div className={styles.stat}><small>Aktivasyon bekleyen</small><strong>{stats.activation}</strong></div><div className={styles.stat}><small>Baskı / kargo</small><strong>{stats.fulfillment}</strong></div><div className={styles.stat}><small>Net sipariş tutarı</small><strong>{money(stats.revenue)}</strong></div></div>
    <div className={styles.toolbar}><label className={styles.field}><span>Ara</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sipariş, müşteri, şirket, VKN, SKU" /></label><label className={styles.field}><span>Müşteri</span><select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value as AudienceFilter)}><option value="ALL">Bireysel + Kurumsal</option><option value="INDIVIDUAL">Bireysel</option><option value="CORPORATE">Kurumsal</option></select></label><label className={styles.field}><span>Ürün</span><select value={productFilter} onChange={(e) => setProductFilter(e.target.value as ProductFilter)}><option value="ALL">Tüm ürünler</option>{Object.entries(productLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={styles.field}><span>Aksiyon</span><select value={operationsFilter} onChange={(e) => setOperationsFilter(e.target.value as OperationsFilter)}><option value="ALL">Tüm aşamalar</option>{Object.entries(operationsLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={styles.field}><span>Sipariş</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}><option value="ALL">Tüm durumlar</option>{Object.entries(orderStatusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {message && <div className={styles.message} role="status">{message}</div>}
    {visible.length === 0 ? <div className={styles.empty}>Bu filtrelerde satış bulunmuyor.</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Sipariş</th><th>Müşteri / şirket</th><th>Ürün</th><th>Tutar</th><th>Ödeme</th><th>Hesap</th><th>Fulfillment</th><th>Son işlem</th><th></th></tr></thead><tbody>{visible.map((order) => {
      const audience = orderAudience(order); const state = orderOperationsState(order); const categories = [...new Set(order.commerce_order_items.map(classifyProduct))];
      return <tr key={order.id} tabIndex={0} onClick={() => onSelectOrder(order.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectOrder(order.id); }}><td><div className={styles.primaryCell}><strong>{order.order_number}</strong><small>{formatDate(order.created_at)}</small></div></td><td><div className={styles.primaryCell}><strong>{audience === "CORPORATE" ? (order.company_name || order.customer_name || "Kurumsal müşteri") : (order.customer_name || "Bireysel müşteri")}</strong><small>{order.guest_email}</small><small>{audience === "CORPORATE" ? `KURUMSAL${order.tax_number ? ` · VKN ${order.tax_number}` : ""}` : "BİREYSEL"}</small></div></td><td><div className={styles.stack}><strong>{order.commerce_order_items.map((item) => `${item.quantity}× ${item.product_name}`).join(" · ")}</strong><small className={styles.subtle}>{categories.map((c) => productLabels[c]).join(" · ")}</small></div></td><td className={styles.money}>{money(order.total_kurus)}</td><td><span className={`${styles.pill} ${state === "PAYMENT_PENDING" ? styles.pillAttention : ""}`}>{order.paid_at ? "Ödendi" : "Bekliyor"}</span></td><td><span className={`${styles.pill} ${state === "ACTIVATION_PENDING" ? styles.pillAttention : ""}`}>{order.activation_claimed_at ? "Aktif" : order.paid_at ? "Aktivasyon" : "—"}</span></td><td><span className={`${styles.pill} ${state === "ISSUE" ? styles.pillDanger : ["FULFILLMENT","SHIPPING"].includes(state) ? styles.pillAttention : ""}`}>{needsPhysicalFulfillment(order) ? attentionLabel(order) : (state === "ACTIVE" ? "Dijital tamam" : attentionLabel(order))}</span></td><td><div className={styles.stack}><strong>{orderStatusLabels[order.status]}</strong><small className={styles.subtle}>{order.paid_at ? formatDate(order.paid_at) : formatDate(order.created_at)}</small></div></td><td className={styles.rowAction}>Detay →</td></tr>;
    })}</tbody></table></div>}
  </>;
}
