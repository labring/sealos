import { encryptCbcBrowser } from '@/utils/encrypt';
import { GenerateLoginUrlOpts } from '@/constants/chat2db';

export async function generateLoginUrl(opts: GenerateLoginUrlOpts): Promise<string> {
  const { userId, userNS, orgId, secretKey, clientDomain, ui = {} } = opts;
  const raw = `${userId}/${userNS}:${orgId}`;
  const key = await encryptCbcBrowser(raw, secretKey);

  const p = new URLSearchParams({
    key,
    theme: ui.theme ?? 'light',
    primaryColor: ui.primaryColor ?? 'bw',
    language: ui.language ?? navigator.language,
    hideAvatar: String(ui.hideAvatar ?? true)
  });

  return `${clientDomain}/workspace?${p.toString()}`;
}
