import { Icon } from "../icons";

export default function Loading() {
  return (
    <main id="main-content" className="p7-shell p7-shell--loading" aria-busy="true" aria-live="polite">
      <aside className="p7-loading-sidebar" aria-hidden="true">
        <div className="p7-loading-brand"><span /><i /></div>
        <div className="p7-loading-nav"><span /><span /><span /><span /><span /><span /></div>
        <div className="p7-loading-account"><span /><i /></div>
      </aside>
      <section className="p7-workspace">
        <header className="p7-topbar">
          <div className="p7-loading-breadcrumb"><span /><i /><b /></div>
          <div className="p7-topbar-actions"><Icon name="headset" /><span className="p7-avatar">YI</span></div>
        </header>
        <div className="p7-content">
          <div className="p7-loading-header"><span /><h1 /><p /></div>
          <section className="p7-loading-grid"><article /><article /><article /></section>
        </div>
      </section>
    </main>
  );
}
