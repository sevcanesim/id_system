"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "./AdminAccess.module.css";

type AdminRow = {
  userId: string;
  email: string | null;
  lastSignInAt: string | null;
  createdAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminAccessPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/access", { credentials: "same-origin", cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Yönetici erişimleri yüklenemedi.");
      setAdmins(result.admins ?? []);
      setCurrentUserId(result.currentUserId ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Yönetici erişimleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function grant(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy("grant"); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/access", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant", email: email.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Super Admin yetkisi verilemedi.");
      setEmail("");
      setMessage("Super Admin yetkisi verildi. Yeni yönetici kendi hesabıyla giriş yapıp Google Authenticator kurmalıdır.");
      await load();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "Super Admin yetkisi verilemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(row: AdminRow) {
    if (row.userId === currentUserId) return;
    const confirmed = window.confirm(`${row.email || "Bu yönetici"} için Super Admin yetkisini kaldırmak istiyor musunuz?`);
    if (!confirmed) return;
    setBusy(row.userId); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/access", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", userId: row.userId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Super Admin yetkisi kaldırılamadı.");
      setMessage("Super Admin yetkisi kaldırıldı ve audit log'a işlendi.");
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Super Admin yetkisi kaldırılamadı.");
    } finally {
      setBusy(null);
    }
  }

  return <main className={styles.page} id="main-content">
    <section className={styles.shell}>
      <header className={styles.heading}>
        <div>
          <span className={styles.kicker}>SUPER ADMIN ERİŞİMİ</span>
          <h1>Yönetici erişimini güvenli biçimde devret.</h1>
          <p>Yetkiyi yalnız mevcut Yenomi kullanıcılarına verin. Şifre veya Authenticator secret paylaşılmaz; yeni yönetici kendi hesabı ve kendi MFA faktörüyle çalışır.</p>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div><h2>Yeni Super Admin yetkilendir</h2><p>Önce normal kullanıcı hesabı oluşturulmuş olmalıdır.</p></div>
        </div>
        <form className={styles.form} onSubmit={grant}>
          <label><span>E-posta</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="yonetici@sirket.com" required /></label>
          <button type="submit" disabled={busy === "grant"}>{busy === "grant" ? "Yetki veriliyor…" : "Super Admin yetkisi ver"}</button>
        </form>
      </section>

      {message && <div className={styles.success} role="status">{message}</div>}
      {error && <div className={styles.error} role="alert">{error}</div>}

      <section className={styles.card}>
        <div className={styles.cardHead}><div><h2>Mevcut Super Adminler</h2><p>Kendi hesabınızı bu ekrandan kaldıramazsınız; sistemde en az bir Super Admin kalır.</p></div><span>{admins.length} yönetici</span></div>
        {loading ? <div className={styles.empty}>Yükleniyor…</div> : admins.length === 0 ? <div className={styles.empty}>Super Admin kaydı bulunamadı.</div> : <div className={styles.list}>
          {admins.map((row) => <article key={row.userId} className={styles.row}>
            <div className={styles.identity}><strong>{row.email || "E-posta bulunamadı"}</strong><span>{row.userId === currentUserId ? "Bu oturum" : "Super Admin"}</span></div>
            <div className={styles.meta}><span>Son giriş: {formatDate(row.lastSignInAt)}</span><span>Hesap: {formatDate(row.createdAt)}</span></div>
            <button type="button" className={styles.danger} disabled={row.userId === currentUserId || busy === row.userId} onClick={() => void revoke(row)}>{row.userId === currentUserId ? "Aktif hesap" : busy === row.userId ? "Kaldırılıyor…" : "Yetkiyi kaldır"}</button>
          </article>)}
        </div>}
      </section>

      <section className={styles.note}>
        <strong>Devir sırası</strong>
        <p>1) Yeni kullanıcı hesabı oluşturulur. 2) Buradan Super Admin yetkisi verilir. 3) Yeni yönetici kendi hesabıyla giriş yapıp kendi Google Authenticator faktörünü kurar. 4) Satış ve operasyon erişimi test edilir. 5) Eski yöneticinin yetkisi buradan kaldırılır.</p>
        <div className={styles.handoverActions}>
          <Link href="/admin/security">MFA doğrulamasına git</Link>
          <Link href="/admin/operations">Operasyon merkezini aç</Link>
          <Link href="/admin/devir-rehberi">Tam devir rehberini aç</Link>
        </div>
      </section>
    </section>
  </main>;
}
