import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@sealos/shadcn-ui/button';
import useSessionStore from '@/stores/session';
import { setPendingCodeRequestId } from '@/utils/oauth2';
import type { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { trackWebVisitorLink } from '@/utils/app-visitor-link';

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
    const submittedSession = useSessionStore.getState().session;
    const submittedToken = useSessionStore.getState().token;
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
      if (decision === 'approve') {
        try {
          const current = useSessionStore.getState();
          if (
            current.session === submittedSession &&
            current.token === submittedToken &&
            current.session?.user?.userUid === payload.analytics_context?.subject_id
          ) {
            await trackWebVisitorLink(payload.analytics_context);
          }
        } catch {
          /* Analytics never blocks login. */
        }
      }
      window.location.assign(payload.redirect_uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:oauth_code_decision_failed'));
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <main className="flex! min-h-screen items-center justify-center overflow-y-auto bg-white px-4 py-8">
      <Head>
        <title>{t('common:oauth_code_title')} · Sealos</title>
        <meta name="referrer" content="no-referrer" />
      </Head>
      <section
        className="flex w-full max-w-[568px] flex-col gap-5 rounded-[20px] bg-white p-5"
        aria-labelledby="authorization-title"
        aria-busy={busy}
      >
        <div className="flex h-7 items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/sealos-auth.svg"
              alt=""
              width={18}
              height={18}
              className="size-[18px]"
            />
          </span>
          <span className="text-base font-medium leading-7">Sealos</span>
        </div>
        <h1 id="authorization-title" className="text-2xl font-medium leading-7">
          {t('common:oauth_code_title')}
        </h1>
        {!context && !error && <p role="status">{t('common:oauth_code_loading')}</p>}
        {context && (
          <>
            <p className="break-words text-sm leading-6 text-zinc-500">
              {t('common:oauth_code_signed_in_as', { account: context.account })}
            </p>
            <div className="flex items-center gap-2.5">
              {context.client_logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={context.client_logo_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-5 shrink-0 rounded object-cover"
                />
              )}
              <p className="break-words text-base font-medium leading-6">{context.client_name}</p>
            </div>
            <p className="text-sm leading-6">{t('common:oauth_code_access_description')}</p>
            <p className="text-sm leading-6 text-zinc-500">{t('common:oauth_code_trust_notice')}</p>
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="h-9 min-w-[85px] rounded-[999px] border-[#E5E5E5] px-4 text-[#171717] shadow-none"
                onClick={() => decide('deny')}
                disabled={busy}
              >
                {t('common:oauth_code_deny')}
              </Button>
              <Button
                className="h-9 min-w-[85px] rounded-[999px] bg-[#0A0A0A] px-4 text-[#FAFAFA] shadow-none hover:bg-[#0A0A0A]/90"
                onClick={() => decide('approve')}
                disabled={busy}
              >
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
