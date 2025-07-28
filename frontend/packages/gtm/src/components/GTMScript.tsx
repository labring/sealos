'use client';
import Script from 'next/script';
import { useEffect } from 'react';

interface GTMScriptProps {
  gtmId: string;
  enabled?: boolean;
  debug?: boolean;
}

export function GTMScript({ gtmId, enabled = true, debug = false }: GTMScriptProps) {
  useEffect(() => {
    if (enabled && typeof window !== 'undefined') {
      if (!window.dataLayer) {
        window.dataLayer = [];
      }

      if (debug) {
        console.log('[Sealos GTM] Initialized with ID:', gtmId);
      }
    }
  }, [enabled, gtmId, debug]);

  if (!enabled || !gtmId) {
    return null;
  }

  return (
    <>
      <Script
        id="gtm-script"
        strategy="beforeInteractive"
        src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}
        onLoad={() => {
          if (debug) {
            console.log('[Sealos GTM] Script loaded successfully');
          }
        }}
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
