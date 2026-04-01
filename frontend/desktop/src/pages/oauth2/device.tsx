import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@labring/sealos-shadcn-ui/button';
import { Input } from '@labring/sealos-shadcn-ui/input';
import { Label } from '@labring/sealos-shadcn-ui/label';
import useSessionStore from '@/stores/session';
import { oauth2AuthorizeContext } from '@/api/auth';
import { ensureLocaleCookie } from '@/utils/ssrLocale';

export default function OAuth2DevicePage() {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const isUserLogin = useSessionStore((s) => s.isUserLogin);
  const [userCode, setUserCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const presetUserCode = useMemo(
    () => (typeof router.query.user_code === 'string' ? router.query.user_code : ''),
    [router.query.user_code]
  );
  const presetRequestId = useMemo(
    () => (typeof router.query.request_id === 'string' ? router.query.request_id : ''),
    [router.query.request_id]
  );

  const checkLoggedIn = async () => {
    return isUserLogin() && Boolean(token);
  };

  const resolveAuthorization = async (code: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = await oauth2AuthorizeContext({ user_code: code });
      const loggedIn = await checkLoggedIn();
      const target = loggedIn
        ? `/oauth2/consent?request_id=${encodeURIComponent(payload.request_id)}`
        : `/oauth2/login?request_id=${encodeURIComponent(payload.request_id)}`;
      await router.replace(target);
    } catch (error) {
      const err = error as { error?: string; error_description?: string };
      setErrorMessage(err.error_description || err.error || 'Failed to load authorization request');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    if (!presetRequestId) return;
    (async () => {
      const loggedIn = await checkLoggedIn();
      if (loggedIn) {
        await router.replace(`/oauth2/consent?request_id=${encodeURIComponent(presetRequestId)}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, presetRequestId]);

  useEffect(() => {
    if (!router.isReady || !presetUserCode) return;
    setUserCode(presetUserCode);
    resolveAuthorization(presetUserCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, presetUserCode]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = userCode.trim().toUpperCase();
    if (!normalizedCode) {
      setErrorMessage('User code is required');
      return;
    }
    await resolveAuthorization(normalizedCode);
  };

  return (
    <div className="mx-auto max-w-2xl py-20 px-4">
      <div className="rounded-xl border p-8">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Activate your device</h1>
          <p className="text-sm text-zinc-600">
            Enter the user code displayed on your device to continue authorization.
          </p>
          <form onSubmit={onSubmit}>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>User code</Label>
                <Input
                  value={userCode}
                  onChange={(event) => setUserCode(event.target.value)}
                  placeholder="ABCD-EFGH"
                />
              </div>
              {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
              <Button type="submit" disabled={isLoading}>
                Continue
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res }: any) {
  ensureLocaleCookie({ req, res, defaultLocale: 'en' });
  return { props: {} };
}
