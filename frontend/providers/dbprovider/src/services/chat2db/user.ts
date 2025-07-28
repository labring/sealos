import { GET, POST } from '@/services/request';
import { encryptCbcBrowser } from '@/api/encrypt';
import { GenerateLoginUrlOpts, UserInfo, CreateApiResponse } from '@/constants/chat2db';

const CHAT2DB_BASE = process.env.NEXT_PUBLIC_CHAT2DB_BASE;

export async function generateLoginUrl(opts: GenerateLoginUrlOpts): Promise<string> {
  const { userId, userNS, orgId, secretKey, ui = {} } = opts;
  const raw = `${userId}/${userNS}:${orgId}`;
  const key = await encryptCbcBrowser(raw, secretKey);
  console.log(raw);
  const p = new URLSearchParams({
    key,
    theme: ui.theme ?? 'light',
    primaryColor: ui.primaryColor ?? 'bw',
    language: ui.language ?? navigator.language,
    hideAvatar: String(ui.hideAvatar ?? true)
  });
  return `${CHAT2DB_BASE}/workspace?${p.toString()}`;
}

export function syncAuthUser(apiKey: string, data: UserInfo) {
  return POST<CreateApiResponse>(`/api/proxy/sync_auth_user_a`, data, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Time-Zone': 'Asia/Shanghai'
    }
  });
}
