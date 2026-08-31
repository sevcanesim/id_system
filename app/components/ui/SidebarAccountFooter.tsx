"use client";

import { Icon } from "../../icons";

export type SidebarAccountFooterProps = {
  accountName: string;
  accountMeta: string;
  initials: string;
  onSignOut?: () => void;
  onClose?: () => void;
};

export default function SidebarAccountFooter({
  accountName,
  accountMeta,
  initials,
  onSignOut,
  onClose,
}: SidebarAccountFooterProps) {
  return (
    <div className="id-sidebar__footer">
      <div className="enterprise-side-links enterprise-side-management canonical-personal-support">
        <a href="mailto:hello@yenomilabs.com" onClick={onClose}>
          <Icon name="headset" />
          <span>Destek</span>
        </a>
        <a href="https://www.yenomilabs.com" target="_blank" rel="noopener noreferrer">
          <Icon name="external" />
          <span>Yenomilabs</span>
        </a>
      </div>

      <div className="id-sidebar__user">
        <span className="id-sidebar__user-avatar" aria-hidden="true">{initials}</span>
        <span className="id-sidebar__user-info">
          <strong className="id-sidebar__user-name">{accountName}</strong>
          <small className="id-sidebar__user-role">{accountMeta}</small>
        </span>
        {onSignOut ? (
          <button
            type="button"
            className="id-sidebar__logout"
            aria-label="Çıkış Yap"
            title="Çıkış Yap"
            onClick={() => {
              onSignOut();
              onClose?.();
            }}
          >
            <Icon name="logout" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
