import { OauthProvider } from '@/types/user';

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
