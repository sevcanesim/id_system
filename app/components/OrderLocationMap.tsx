"use client";

import { useEffect, useRef, useState } from "react";

type Coordinates = { latitude: number; longitude: number };

type Props = {
  latitude: number | null;
  longitude: number | null;
  onPositionChange: (coordinates: Coordinates) => void;
};

declare global {
  interface Window {
    google?: any;
    __yenomiMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.__yenomiMapsPromise) return window.__yenomiMapsPromise;

  window.__yenomiMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-yenomi-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps yüklenemedi.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=tr&region=TR`;
    script.async = true;
    script.defer = true;
    script.dataset.yenomiGoogleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps yüklenemedi."));
    document.head.appendChild(script);
  });

  return window.__yenomiMapsPromise;
}

export default function OrderLocationMap({ latitude, longitude, onPositionChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const hasCoordinates = latitude != null && longitude != null;

  useEffect(() => {
    if (!hasCoordinates) {
      setStatus("idle");
      return;
    }

    if (!apiKey) {
      setStatus("unavailable");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;

        const center = { lat: latitude, lng: longitude };

        if (!mapRef.current) {
          const map = new window.google.maps.Map(containerRef.current, {
            center,
            zoom: 17,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
            styles: [
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] },
            ],
          });

          const marker = new window.google.maps.Marker({
            map,
            position: center,
            draggable: true,
            title: "Teslimat konumu",
            animation: window.google.maps.Animation.DROP,
          });

          map.addListener("click", (event: any) => {
            const lat = event.latLng?.lat();
            const lng = event.latLng?.lng();
            if (typeof lat !== "number" || typeof lng !== "number") return;
            marker.setPosition({ lat, lng });
            onPositionChange({ latitude: lat, longitude: lng });
          });

          marker.addListener("dragend", () => {
            const position = marker.getPosition();
            if (!position) return;
            onPositionChange({ latitude: position.lat(), longitude: position.lng() });
          });

          mapRef.current = map;
          markerRef.current = marker;
        } else {
          markerRef.current?.setPosition(center);
          mapRef.current.panTo(center);
          mapRef.current.setZoom(17);
        }

        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
    };
  }, [apiKey, hasCoordinates, latitude, longitude, onPositionChange]);

  if (!hasCoordinates) {
    return (
      <div className="location-map-empty">
        <strong>Harita henüz hazır değil</strong>
        <span>Önce “Konumumu Kullan” ile konumunu al veya adresi elle gir.</span>
      </div>
    );
  }

  if (status === "unavailable") {
    return <div className="location-map-fallback">Harita önizlemesi için Browser Maps Key yapılandırılmalı.</div>;
  }

  if (status === "error") {
    return <div className="location-map-fallback">Harita yüklenemedi. Koordinat kaydedildi; adresi elle kontrol edebilirsin.</div>;
  }

  return (
    <div className="location-map-shell">
      <div className="location-map-toolbar">
        <div>
          <strong>Haritada doğrula</strong>
          <span>Pini sürükle veya haritada doğru noktaya dokun.</span>
        </div>
        <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer">
          Google Maps’te Aç
        </a>
      </div>
      <div ref={containerRef} className="location-map-canvas" aria-label="Teslimat konumu haritası" />
      {status === "loading" && <div className="location-map-loading">Harita yükleniyor…</div>}
    </div>
  );
}
