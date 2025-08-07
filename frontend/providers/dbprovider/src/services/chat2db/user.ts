import { GET, POST } from '@/services/request';
import { encryptCbcBrowser } from '@/api/encrypt';
import { GenerateLoginUrlOpts, UserInfo, CreateApiResponse } from '@/constants/chat2db';
import { getAppEnv } from '@/api/platform';

export async function generateLoginUrl(opts: GenerateLoginUrlOpts): Promise<string> {
  const { userId, userNS, orgId, secretKey, ui = {} } = opts;
  const raw = `${userId}/${userNS}:${orgId}`;
  const key = await encryptCbcBrowser(raw, secretKey);

  const p = new URLSearchParams({
    key,
    theme: ui.theme ?? 'light',
    primaryColor: ui.primaryColor ?? 'bw',
    language: ui.language ?? navigator.language,
    hideAvatar: String(ui.hideAvatar ?? true)
  });

  const envData = await getAppEnv();
  const clientDomain = envData.CLIENT_DOMAIN_NAME;
  console.log('clientDomain', clientDomain);

  if (!clientDomain) {
    throw new Error('CLIENT_DOMAIN_NAME environment variable is not set');
  }

  const baseUrl = clientDomain;

  return `${baseUrl}/workspace?${p.toString()}`;
}
