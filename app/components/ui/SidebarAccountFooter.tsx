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
    <div className="unified-sidebar-account id-sidebar__footer">
      <div className="enterprise-side-links enterprise-side-management canonical-personal-support unified-sidebar-account__support">
        <a href="mailto:hello@yenomilabs.com" onClick={onClose}>
          <Icon name="headset" />
          <span>Destek</span>
        </a>
        <a href="https://www.yenomilabs.com" target="_blank" rel="noopener noreferrer" onClick={onClose}>
          <Icon name="external" />
          <span>Yenomilabs</span>
        </a>
      </div>

      <div className="unified-sidebar-account__identity id-sidebar__user">
        <span className="unified-sidebar-account__avatar id-sidebar__user-avatar" aria-hidden="true">{initials}</span>
        <span className="unified-sidebar-account__info id-sidebar__user-info">
          <strong className="unified-sidebar-account__name id-sidebar__user-name" title={accountName}>{accountName}</strong>
          <small className="unified-sidebar-account__meta id-sidebar__user-role" title={accountMeta}>{accountMeta}</small>
        </span>
        {onSignOut ? (
          <button
            type="button"
            className="unified-sidebar-account__logout id-sidebar__logout"
            aria-label="Çıkış yap"
            title="Çıkış yap"
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
