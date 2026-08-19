'use client';
import Script from 'next/script';

export interface Rybbit {
  event: (eventName: string, properties?: Record<string, string | number>) => void;
  pageview: () => void;
}

declare global {
  interface Window {
    rybbit?: Rybbit;
  }
}

interface RybbitScriptProps {
  host: string;
  siteId: string;
  debug?: boolean;
}

export function RybbitScript({ host, siteId, debug = false }: RybbitScriptProps) {
  if (debug) {
    console.log('[Sealos Rybbit] host:', host, 'site ID:', siteId);
  }

  if (!host || !siteId) {
    return null;
  }

  return (
    <Script
      id="rybbit-script"
      strategy="afterInteractive"
      src={`${host.replace(/\/+$/, '')}/api/script.js`}
      data-site-id={siteId}
    />
  );
}
