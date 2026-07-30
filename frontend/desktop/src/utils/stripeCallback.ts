import { BRAIN_APP_KEY, COSTCENTER_APP_KEY } from '@/constants/app';

export const resolveStripeCallbackTarget = (payApp: string | string[] | undefined) => {
  if (payApp === BRAIN_APP_KEY) {
    return {
      appKey: BRAIN_APP_KEY,
      pathname: '/billing'
    } as const;
  }

  return {
    appKey: COSTCENTER_APP_KEY,
    pathname: '/'
  } as const;
};
