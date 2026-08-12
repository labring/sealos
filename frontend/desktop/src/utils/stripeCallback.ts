import { BRAIN_APP_KEY, COSTCENTER_APP_KEY } from '@/constants/app';

export const resolveStripeCallbackTarget = (payApp: string | string[] | undefined) => {
  const normalizedPayApp = Array.isArray(payApp) ? payApp[0] : payApp;
  if (normalizedPayApp === BRAIN_APP_KEY) {
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
