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
  debug?: boolean;
}

export function RybbitScript({ debug = false }: RybbitScriptProps) {
  const host = process.env.NEXT_PUBLIC_RYBBIT_HOST?.replace(/\/+$/, '');
  const siteId = process.env.NEXT_PUBLIC_RYBBIT_SITE_ID;

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
      src={`${host}/api/script.js`}
      data-site-id={siteId}
    />
  );
}
