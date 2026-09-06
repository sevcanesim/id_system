"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button, Input } from "../ui/DesignSystem";
import { Icon } from "../../icons";

type BarcodeDetection = { rawValue?: string };
type BarcodeDetectorInstance = { detect: (source: HTMLVideoElement) => Promise<BarcodeDetection[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;
type BarcodeWindow = Window & typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor };

export type InstantConnectScannerCopy = {
  eyebrow: string;
  title: string;
  description: string;
  preparing: string;
  unsupported: string;
  manualLabel: string;
  manualPlaceholder: string;
  manualSubmit: string;
  invalid: string;
  privacy: string;
  cancel: string;
  processing: string;
};

export default function InstantConnectScanner({
  open,
  copy,
  onClose,
  onScan,
}: {
  open: boolean;
  copy: InstantConnectScannerCopy;
  onClose: () => void;
  onScan: (rawValue: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState<"preparing" | "ready" | "unsupported" | "processing">("preparing");
  const [manualValue, setManualValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let scanning = false;

    const stopCamera = () => {
      if (frame) window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const submitRawValue = async (rawValue: string) => {
      if (cancelled || scanning) return;
      scanning = true;
      setStatus("processing");
      setError("");
      const result = await onScanRef.current(rawValue);
      if (cancelled) return;
      if (result.ok) {
        stopCamera();
        onClose();
        return;
      }
      scanning = false;
      setStatus("ready");
      setError(result.error || copy.invalid);
    };

    const startCamera = async () => {
      setStatus("preparing");
      setError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stopCamera();
          return;
        }
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const Detector = (window as BarcodeWindow).BarcodeDetector;
        if (!Detector) {
          setStatus("unsupported");
          return;
        }
        const detector = new Detector({ formats: ["qr_code"] });
        setStatus("ready");

        const readFrame = async () => {
          if (cancelled || scanning) return;
          try {
            if (videoRef.current?.readyState && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const detections = await detector.detect(videoRef.current);
              const rawValue = detections[0]?.rawValue;
              if (rawValue) {
                await submitRawValue(rawValue);
                if (scanning) return;
              }
            }
          } catch {
            // Camera frames can intermittently fail while focus/exposure changes.
          }
          if (!cancelled && !scanning) frame = window.requestAnimationFrame(() => { void readFrame(); });
        };
        void readFrame();
      } catch {
        if (!cancelled) {
          setStatus("unsupported");
          setError(copy.unsupported);
        }
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [copy.invalid, copy.unsupported, onClose, open]);

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawValue = manualValue.trim();
    if (!rawValue) {
      setError(copy.invalid);
      return;
    }
    setStatus("processing");
    setError("");
    const result = await onScan(rawValue);
    if (result.ok) {
      onClose();
      return;
    }
    setStatus("unsupported");
    setError(result.error || copy.invalid);
  }

  function close() {
    setError("");
    setManualValue("");
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="p12-instant-scanner"
      aria-labelledby="p12-instant-scanner-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
    >
      <div className="p12-instant-scanner__header">
        <div>
          <span className="p12-instant-scanner__eyebrow"><Icon name="qr" /> {copy.eyebrow}</span>
          <h2 id="p12-instant-scanner-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <button type="button" className="p12-instant-scanner__close" onClick={close} aria-label={copy.cancel}><Icon name="close" /></button>
      </div>

      <div className="p12-instant-scanner__camera" aria-live="polite">
        <video ref={videoRef} muted playsInline aria-label={copy.title} />
        <span className="p12-instant-scanner__frame" aria-hidden="true" />
        <p>{status === "processing" ? copy.processing : status === "preparing" ? copy.preparing : copy.description}</p>
      </div>

      {status === "unsupported" && (
        <form className="p12-instant-scanner__manual" onSubmit={(event) => void submitManual(event)}>
          <label htmlFor="p12-instant-scanner-manual">{copy.manualLabel}</label>
          <div>
            <Input
              id="p12-instant-scanner-manual"
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              placeholder={copy.manualPlaceholder}
              autoCapitalize="off"
              autoCorrect="off"
              inputMode="url"
            />
            <Button type="submit" variant="secondary-strong">{copy.manualSubmit}</Button>
          </div>
        </form>
      )}

      {error && <p className="p12-instant-scanner__message" role="alert">{error}</p>}
      <p className="p12-instant-scanner__privacy">{copy.privacy}</p>
      <Button type="button" variant="ghost" className="p12-instant-scanner__cancel" onClick={close}>{copy.cancel}</Button>
    </dialog>
  );
}
