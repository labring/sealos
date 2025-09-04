import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we're actually on the root path
    if (router.isReady && (router.asPath === '/' || router.asPath.startsWith('/?'))) {
      console.log('router.index', router.query);
      // Forward all query parameters to /plan page
      const { query } = router;
      const params = new URLSearchParams();

      // Add all query parameters to the URL
      Object.entries(query).forEach(([key, value]) => {
        if (typeof value === 'string') {
          params.set(key, value);
        } else if (Array.isArray(value)) {
          params.set(key, value[0]);
        }
      });

      const queryString = params.toString();
      const targetUrl = queryString ? `/plan?${queryString}` : '/plan';

      // Replace current route to avoid adding to history
      router.replace(targetUrl);
    }
  }, [router]);

  // Show minimal loading state while redirecting
  return <div className="flex items-center justify-center min-h-screen"></div>;
}
