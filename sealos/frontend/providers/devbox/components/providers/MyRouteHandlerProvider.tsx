'use client';

import NProgress from 'nprogress';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { usePathname } from '@/i18n';
import { useGlobalStore } from '@/stores/global';

import 'nprogress/nprogress.css';

const RouteHandlerProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { setLastRoute } = useGlobalStore();

  useEffect(() => {
    return () => {
      setLastRoute(pathname);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handleRouteChangeStart = () => NProgress.start();
    const handleRouteChangeComplete = () => NProgress.done();
    const handleRouteChangeError = () => NProgress.done();

    document.addEventListener('routeChangeStart', handleRouteChangeStart);
    document.addEventListener('routeChangeComplete', handleRouteChangeComplete);
    document.addEventListener('routeChangeError', handleRouteChangeError);

    return () => {
      document.removeEventListener('routeChangeStart', handleRouteChangeStart);
      document.removeEventListener('routeChangeComplete', handleRouteChangeComplete);
      document.removeEventListener('routeChangeError', handleRouteChangeError);
    };
  }, []);

  return <div>{children}</div>;
};

export default RouteHandlerProvider;
