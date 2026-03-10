import { OauthProvider } from '@/types/user';

const OAUTH2_PENDING_REQUEST_ID_KEY = 'oauth2_pending_request_id';

export const getProxiedOAuth2InitiatorUrl = ({
  callbackUrl,
  state,
  provider,
  proxyAddress,
  id,
  additionalParams
}: {
  callbackUrl: string;
  state: string;
  proxyAddress: string;
  provider: OauthProvider;
  id: string;
  additionalParams?: Record<string, string>;
}) => {
  const target = new URL(proxyAddress);
  const callback = new URL(callbackUrl);
  target.searchParams.append(
    'oauthProxyState',
    encodeURIComponent(callback.toString()) + '_' + state
  );
  target.searchParams.append('oauthProxyClientID', id);
  target.searchParams.append('oauthProxyProvider', provider);

  if (additionalParams) {
    target.searchParams.append(
      'additionalParams',
      new URLSearchParams(additionalParams).toString()
    );
  }

  return target.toString();
};

export const buildOauth2ConsentPath = (requestId: string) =>
  `/oauth2/consent?request_id=${encodeURIComponent(requestId)}`;

export const setPendingOauth2RequestId = (requestId: string) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(OAUTH2_PENDING_REQUEST_ID_KEY, requestId);
};

export const getPendingOauth2RequestId = () => {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(OAUTH2_PENDING_REQUEST_ID_KEY) || '';
};

export const consumePendingOauth2RequestId = () => {
  if (typeof window === 'undefined') return '';
  const requestId = sessionStorage.getItem(OAUTH2_PENDING_REQUEST_ID_KEY) || '';
  sessionStorage.removeItem(OAUTH2_PENDING_REQUEST_ID_KEY);
  return requestId;
};

export const consumePendingOauth2RedirectPath = () => {
  const requestId = consumePendingOauth2RequestId();
  if (!requestId) return '';
  return buildOauth2ConsentPath(requestId);
};
