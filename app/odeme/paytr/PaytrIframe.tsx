"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";

const PAYTR_IFRAME_URL = "https://www.paytr.com/odeme/guvenli";

declare global {
  interface Window {
    iFrameResize?: (
      options?: { checkOrigin?: string[] },
      target?: string,
    ) => void;
  }
}

type PaytrIframeProps = {
  token: string;
};

/**
 * PayTR V2 sends its rendered height to this page with postMessage. We keep
 * the card data inside PayTR's origin and only initialize its official
 * resizer after the library has loaded.
 */
export default function PaytrIframe({ token }: PaytrIframeProps) {
  const [resizerReady, setResizerReady] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  const resizeIframe = useCallback(() => {
    window.iFrameResize?.(
      { checkOrigin: ["https://www.paytr.com"] },
      "#paytriframe",
    );
  }, []);

  useEffect(() => {
    if (resizerReady) resizeIframe();
  }, [resizerReady, resizeIframe]);

  return (
    <div className="paytr-iframe-wrap" aria-busy={!frameLoaded}>
      <Script
        src="https://www.paytr.com/js/iframeResizer.min.js?v2"
        strategy="afterInteractive"
        onLoad={() => setResizerReady(true)}
      />
      {!frameLoaded ? (
        <p className="paytr-iframe-loading" role="status">
          Güvenli ödeme formu hazırlanıyor…
        </p>
      ) : null}
      <iframe
        id="paytriframe"
        className="paytr-checkout-frame"
        src={`${PAYTR_IFRAME_URL}/${encodeURIComponent(token)}`}
        title="PayTR güvenli ödeme"
        allow="payment"
        referrerPolicy="no-referrer"
        scrolling="no"
        onLoad={() => {
          setFrameLoaded(true);
          if (resizerReady) resizeIframe();
        }}
      />
    </div>
  );
}
