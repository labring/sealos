import { trackEventName } from '@/constants/account';
import { Umami } from '@umami/node';
const getUmami = () => {
  return new Umami({
    websiteId: global.AppConfig.tracking.websiteId,
    hostUrl: global.AppConfig.tracking.hostUrl
  });
};
export type TLoginPayload = {
  userUid: string;
  userId: string;
};
export const trackSignUp = (data: TLoginPayload) => {
  const umami = getUmami();
  return umami
    .track(trackEventName.signUp, data)
    .then((res) => {
      console.log('[tracking][signUp][success]');
    })
    .catch((e) => {
      console.error('[tracking][signUp]:', e);
      return Promise.resolve(null);
    });
};
export const trackDailyLoginFirst = (data: TLoginPayload) => {
  const umami = getUmami();
  return umami.track(trackEventName.dailyLoginFirst, data).catch((e) => {
    console.error('[tracking][dailyLoginFirst]:', e);
    return Promise.resolve(null);
  });
};

export type TDesktopNewUserPayload = {
  userUid: string;
  clientId: string;
  accountAgeDays: number;
  region: string;
};

const getRybbitConfig = () => {
  const layout = global.AppConfig?.desktop?.layout;
  const host = layout?.rybbitHost?.replace(/\/+$/, '');
  const siteId = layout?.rybbitSiteId;
  return host && siteId ? { host, siteId } : null;
};

export const trackDesktopNewUser = (data: TDesktopNewUserPayload) => {
  const rybbit = getRybbitConfig();
  if (!rybbit) return Promise.resolve(null);
  const { userUid, clientId, accountAgeDays, region } = data;
  const post = (path: string, body: Record<string, unknown>) =>
    fetch(`${rybbit.host}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1500)
    });
  return post('/identify', {
    site_id: rybbit.siteId,
    user_id: userUid,
    traits: { region },
    is_new_identify: true
  })
    .then(() =>
      post('/track', {
        site_id: rybbit.siteId,
        hostname: new URL(region).hostname,
        pathname: '/api/auth/oauth2/token',
        type: 'custom_event',
        event_name: 'desktop_new_user',
        user_id: userUid,
        properties: {
          client_id: clientId,
          account_age_days: String(accountAgeDays),
          region
        }
      })
    )
    .then(() => {
      console.log('[tracking][desktopNewUser][success]');
    })
    .catch((e) => {
      console.error('[tracking][desktopNewUser]:', e);
      return Promise.resolve(null);
    });
};
