import { GET, POST } from '@/services/request';
import { encryptCbcBrowser } from '@/api/encrypt';
import { GenerateLoginUrlOpts } from '@/constants/chat2db';

const CHAT2DB_BASE = process.env.NEXT_PUBLIC_CHAT2DB_BASE;

export async function generateLoginUrl(opts: GenerateLoginUrlOpts): Promise<string> {
  const { userId, orgId, secretKey, ui = {} } = opts;
  const raw = `${userId}:${orgId}`;
  const key = await encryptCbcBrowser(raw, secretKey);

  const p = new URLSearchParams({
    key,
    theme: ui.theme ?? 'light',
    primaryColor: ui.primaryColor ?? 'bw',
    language: ui.language ?? navigator.language,
    hideAvatar: String(ui.hideAvatar ?? true)
  });
  return `${CHAT2DB_BASE}/workspace?${p.toString()}`;
}

export function logout() {
  return POST('/api/oauth/logout_a');
}

export function syncAuthUser(key: string) {
  return POST('/api/open/enterprise/sync_auth_user', new URLSearchParams({ key }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
}
