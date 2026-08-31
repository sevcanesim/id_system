"use client";

import { useState } from "react";
import { Icon } from "../../icons";
import styles from "./SidebarFooterActions.module.css";

type SidebarFooterActionsProps = {
  onSignOut?: () => void | Promise<void>;
  onAfterAction?: () => void;
};

export default function SidebarFooterActions({
  onSignOut,
  onAfterAction,
}: SidebarFooterActionsProps) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (!onSignOut || signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
      onAfterAction?.();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className={styles.actions} aria-label="Hızlı işlemler">
      <a
        className={styles.action}
        href="mailto:hello@yenomilabs.com"
        onClick={onAfterAction}
      >
        <Icon name="headset" />
        <span className={styles.label}>Destek</span>
      </a>

      <a
        className={styles.action}
        href="https://www.yenomilabs.com"
        target="_blank"
        rel="noopener noreferrer"
        onClick={onAfterAction}
      >
        <Icon name="external" />
        <span className={styles.label}>Yenomilabs</span>
      </a>

      {onSignOut ? (
        <button
          type="button"
          className={`${styles.action} ${styles.signOut}`}
          aria-label="Çıkış Yap"
          title="Çıkış Yap"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          <Icon name="logout" />
          <span className={styles.label}>{signingOut ? "Çıkılıyor…" : "Çıkış"}</span>
        </button>
      ) : null}
    </div>
  );
}
