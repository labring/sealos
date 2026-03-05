import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@sealos/shadcn-ui/button';
import { oauth2AuthorizeContext, oauth2AuthorizeDecision } from '@/api/auth';
import useSessionStore from '@/stores/session';
import { OAuth2AuthorizeContextResponse } from '@/schema/oauth2';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { Loader2 } from 'lucide-react';

type SubmitState = 'idle' | 'submitting' | 'completed';

export default function OAuth2ConsentPage() {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const isUserLogin = useSessionStore((s) => s.isUserLogin);
  const [context, setContext] = useState<OAuth2AuthorizeContextResponse | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  const checkLoggedIn = async () => {
    return isUserLogin() && Boolean(token);
  };

  useEffect(() => {
    if (!router.isReady) return;
    const requestId = typeof router.query.request_id === 'string' ? router.query.request_id : '';
    if (!requestId) {
      setErrorMessage('request_id is required');
      return;
    }
    (async () => {
      try {
        const loggedIn = await checkLoggedIn();
        if (!loggedIn) {
          await router.replace(`/oauth2/login?request_id=${encodeURIComponent(requestId)}`);
          return;
        }
        const data = await oauth2AuthorizeContext({ request_id: requestId }, token);
        setContext(data as OAuth2AuthorizeContextResponse);
      } catch (error) {
        const err = error as { error?: string; error_description?: string };
        setErrorMessage(err.error_description || err.error || 'Failed to load authorization');
      }
    })();
  }, [isUserLogin, router, token]);

  const onDecision = async (decision: 'approve' | 'deny') => {
    if (!context) return;
    setSubmitState('submitting');
    setErrorMessage('');
    try {
      await oauth2AuthorizeDecision(
        {
          request_id: context.request_id,
          decision
        },
        token
      );
      setResultMessage(
        decision === 'approve'
          ? 'Authorization approved. You can return to your device.'
          : 'Authorization denied.'
      );
      setSubmitState('completed');
    } catch (error) {
      const err = error as { error?: string; error_description?: string };
      setErrorMessage(err.error_description || err.error || 'Failed to submit decision');
      setSubmitState('idle');
    }
  };

  if (!context && !errorMessage) {
    return (
      <div className="mx-auto max-w-2xl py-20 px-4">
        <div className="flex items-center gap-3 text-zinc-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Loading authorization request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-20 px-4">
      <div className="rounded-xl border p-8">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Authorize device request</h1>
          {context ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {context.client_logo_url ? (
                  // URL referenced logo
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={context.client_logo_url}
                    alt={context.client_name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : null}
                <p className="font-semibold">{context.client_name}</p>
              </div>
              <p className="text-sm text-zinc-600">
                This app is requesting access to your account. Confirm only if you trust this app.
              </p>
              {context.has_existing_consent ? (
                <p className="text-xs text-zinc-500">
                  You have previously authorized this app. Confirm to continue this login request.
                </p>
              ) : null}
            </div>
          ) : null}
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          {resultMessage ? <p className="text-sm text-green-700">{resultMessage}</p> : null}
          {submitState !== 'completed' ? (
            <div className="flex gap-2">
              <Button onClick={() => onDecision('deny')} disabled={submitState === 'submitting'}>
                Deny
              </Button>
              <Button onClick={() => onDecision('approve')} disabled={submitState === 'submitting'}>
                Approve
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res }: any) {
  ensureLocaleCookie({ req, res, defaultLocale: 'en' });
  return { props: {} };
}
