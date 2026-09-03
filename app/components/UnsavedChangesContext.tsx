"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type UnsavedChangesContextType = {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  confirmNavigation: (onConfirm?: () => void) => boolean;
  guardLinkClick: (e: React.MouseEvent, href?: string) => void;
  bypassGuard: () => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextType>({
  isDirty: false,
  setIsDirty: () => {},
  confirmNavigation: (onConfirm) => {
    onConfirm?.();
    return true;
  },
  guardLinkClick: () => {},
  bypassGuard: () => {},
});

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirtyState] = useState(false);
  const sentinelPushedRef = useRef(false);
  const router = useRouter();

  const setIsDirty = useCallback((dirty: boolean) => {
    setIsDirtyState(dirty);
  }, []);

  const bypassGuard = useCallback(() => {
    setIsDirtyState(false);
    if (sentinelPushedRef.current) {
      sentinelPushedRef.current = false;
    }
  }, []);

  const confirmNavigation = useCallback((onConfirm?: () => void) => {
    if (!isDirty) {
      onConfirm?.();
      return true;
    }
    const confirmed = window.confirm("Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinizden emin misiniz?");
    if (confirmed) {
      bypassGuard();
      onConfirm?.();
      return true;
    }
    return false;
  }, [isDirty, bypassGuard]);

  const guardLinkClick = useCallback((e: React.MouseEvent, href?: string) => {
    if (isDirty) {
      const confirmed = window.confirm("Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinizden emin misiniz?");
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        bypassGuard();
        if (href) {
          e.preventDefault();
          router.push(href);
        }
      }
    }
  }, [isDirty, router, bypassGuard]);

  // Browser refresh & tab close protection
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Browser Back & Forward button protection via popstate
  useEffect(() => {
    if (!isDirty) {
      if (sentinelPushedRef.current) {
        sentinelPushedRef.current = false;
      }
      return;
    }

    // Push dummy sentinel entry ONCE when dirty state becomes active
    if (!sentinelPushedRef.current) {
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
      sentinelPushedRef.current = true;
    }

    const handlePopState = () => {
      if (!isDirty) return;

      const confirmed = window.confirm("Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinizden emin misiniz?");
      if (!confirmed) {
        // User cancelled: restore sentinel without growing history stack
        window.history.pushState({ unsavedGuard: true }, "", window.location.href);
      } else {
        // User confirmed: bypass guard and navigate back to actual previous route
        sentinelPushedRef.current = false;
        setIsDirtyState(false);
        window.history.back();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty, confirmNavigation, guardLinkClick, bypassGuard }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export const useUnsavedChanges = () => useContext(UnsavedChangesContext);
