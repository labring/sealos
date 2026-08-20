import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useSessionStore from '@/stores/session';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { setPendingOauth2RequestId } from '@/utils/oauth2';
import { Loader2 } from 'lucide-react';

export default function OAuth2LoginPage() {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const isUserLogin = useSessionStore((s) => s.isUserLogin);

  useEffect(() => {
    if (!router.isReady) return;
    const requestId = typeof router.query.request_id === 'string' ? router.query.request_id : '';
    if (!requestId) {
      router.replace('/signin');
      return;
    }

    if (isUserLogin() && token) {
      router.replace(`/oauth2/consent?request_id=${encodeURIComponent(requestId)}`);
      return;
    }

    setPendingOauth2RequestId(requestId);
    router.replace(`/signin?oauth2_request_id=${encodeURIComponent(requestId)}`);
  }, [isUserLogin, router, token]);

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
