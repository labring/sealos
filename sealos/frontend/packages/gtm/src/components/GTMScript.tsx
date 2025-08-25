'use client';
import Script from 'next/script';
import { useEffect, useRef } from 'react';

interface GTMScriptProps {
  gtmId: string;
  enabled?: boolean;
  debug?: boolean;
  onInit?: () => void;
}

export function GTMScript({ gtmId, enabled = true, debug = false, onInit }: GTMScriptProps) {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (enabled && typeof window !== 'undefined') {
      if (!window.dataLayer) {
        window.dataLayer = [];
      }

      window.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      });

      if (debug) {
        console.log('[Sealos GTM] Initialized with ID:', gtmId);
      }
    }
  }, [enabled, gtmId, debug]);

  const handleScriptLoad = () => {
    if (!isInitialized.current && enabled && typeof window !== 'undefined') {
      isInitialized.current = true;

      window.dataLayer?.push({
        event: 'gtm_initialized',
        context: 'app',
        gtm_id: gtmId,
        timestamp: new Date().toISOString()
      });

      if (debug) {
        console.log('[Sealos GTM] Script loaded successfully, initialization event pushed');
      }

      onInit?.();
    }
  };

  if (!enabled || !gtmId) {
    return null;
  }

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}
        onLoad={handleScriptLoad}
        onError={() => {
          if (debug) {
            console.error('[Sealos GTM] Script failed to load');
          }
        }}
      />

      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
