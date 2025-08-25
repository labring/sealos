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
