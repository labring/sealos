import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { Loader2 } from 'lucide-react';

export default function OAuth2AuthorizePage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const requestId = typeof router.query.request_id === 'string' ? router.query.request_id : '';
    const target = requestId
      ? `/oauth2/consent?request_id=${encodeURIComponent(requestId)}`
      : '/oauth2/device';
    router.replace(target);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
    </div>
  );
}

export async function getServerSideProps({ req, res }: any) {
  ensureLocaleCookie({ req, res, defaultLocale: 'en' });
  return { props: {} };
}
