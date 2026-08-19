"use client";

import { useEffect } from "react";

type Props = { profileId: string; generatedAt: string };

export default function PublicProfileProtection({ profileId, generatedAt }: Props) {
  useEffect(() => {
    const preventContext = (event: MouseEvent) => event.preventDefault();
    const preventDrag = (event: DragEvent) => event.preventDefault();
    const preventCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      window.alert("Bu profilin içeriği kopyalamaya karşı korunmaktadır.");
    };
    const preventShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["c", "s", "p", "u"].includes(key)) {
        event.preventDefault();
      }
    };
    document.addEventListener("contextmenu", preventContext);
    document.addEventListener("dragstart", preventDrag);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("keydown", preventShortcut);
    return () => {
      document.removeEventListener("contextmenu", preventContext);
      document.removeEventListener("dragstart", preventDrag);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("keydown", preventShortcut);
    };
  }, []);

  const stamp = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(generatedAt));

  return (
    <div className="p12-profile-watermark" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => (
        <span key={index}>YENOMI ID • {profileId.toUpperCase()} • {stamp}</span>
      ))}
    </div>
  );
}
