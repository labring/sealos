import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@sealos/shadcn-ui/button';
import useSessionStore from '@/stores/session';
import { setPendingCodeRequestId } from '@/utils/oauth2';
import type { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';

type Context = {
  client_name: string;
  client_logo_url?: string;
  account: string;
  expires_at: string;
};

export default function OAuthCodePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const isUserLogin = useSessionStore((s) => s.isUserLogin);
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const requestId = typeof router.query.request_id === 'string' ? router.query.request_id : '';

  useEffect(() => {
    if (!router.isReady) return;
    setContext(null);
    setError('');
    if (!requestId) {
      setError(t('common:oauth_code_missing_request'));
      return;
    }
    if (!isUserLogin() || !token) {
      setPendingCodeRequestId(requestId);
      void router.replace(`/signin?oauth_code_request_id=${encodeURIComponent(requestId)}`);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/auth/oauth2/code/context?request_id=${encodeURIComponent(requestId)}`,
          {
            credentials: 'same-origin',
            headers: { Authorization: encodeURIComponent(token) },
            signal: controller.signal
          }
        );
        const payload = await response.json();
        if (response.status === 401) {
          setPendingCodeRequestId(requestId);
          await router.replace(`/signin?oauth_code_request_id=${encodeURIComponent(requestId)}`);
          return;
        }
        if (!response.ok)
          throw new Error(payload.error_description || t('common:oauth_code_load_failed_retry'));
        setContext(payload);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : t('common:oauth_code_load_failed'));
      }
    })();
    return () => controller.abort();
  }, [router.isReady, requestId, token, isUserLogin, router, t]);

  const decide = async (decision: 'approve' | 'deny') => {
    if (submitting.current || !context) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/oauth2/code/decision', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Authorization: encodeURIComponent(token) },
        body: JSON.stringify({ request_id: requestId, decision })
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error_description || t('common:oauth_code_decision_failed_retry'));
      window.location.assign(payload.redirect_uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:oauth_code_decision_failed'));
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <Head>
        <title>{t('common:oauth_code_title')} · Sealos</title>
        <meta name="referrer" content="no-referrer" />
      </Head>
      <section
        className="space-y-6 rounded-xl border bg-white p-6 sm:p-8"
        aria-labelledby="authorization-title"
        aria-busy={busy}
      >
        <p className="font-semibold">Sealos</p>
        <h1 id="authorization-title" className="text-2xl font-semibold">
          {t('common:oauth_code_title')}
        </h1>
        {!context && !error && <p role="status">{t('common:oauth_code_loading')}</p>}
        {context && (
          <>
            <p className="break-words text-sm text-zinc-600">
              {t('common:oauth_code_signed_in_as')} <strong>{context.account}</strong>
            </p>
            <div className="flex items-center gap-3">
              {context.client_logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={context.client_logo_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded"
                />
              )}
              <p className="break-words font-semibold">{context.client_name}</p>
            </div>
            <p>{t('common:oauth_code_access_description')}</p>
            <p className="text-sm text-zinc-600">{t('common:oauth_code_trust_notice')}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => decide('deny')} disabled={busy}>
                {t('common:oauth_code_deny')}
              </Button>
              <Button onClick={() => decide('approve')} disabled={busy}>
                {t('common:oauth_code_approve')}
              </Button>
            </div>
            {busy && <p role="status">{t('common:oauth_code_returning')}</p>}
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res, locales }) => {
  const { ensureLocaleCookie } = await import('@/utils/ssrLocale');
  const { serverSideTranslations } = await import('next-i18next/serverSideTranslations');
  const locale = ensureLocaleCookie({ req, res, defaultLocale: 'en' });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, locales || []))
    }
  };
};
