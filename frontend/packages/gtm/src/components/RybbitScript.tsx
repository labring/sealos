'use client';
import Script from 'next/script';
import { useEffect } from 'react';

import { configureGTM, flushRybbitQueue } from '../track';

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
  useEffect(() => {
    configureGTM({ rybbitEnabled: !!host && !!siteId });
    flushRybbitQueue();
    return () => {
      configureGTM({ rybbitEnabled: false });
    };
  }, [host, siteId]);

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
      onLoad={() => flushRybbitQueue()}
      onError={() => configureGTM({ rybbitEnabled: false })}
    />
  );
}
