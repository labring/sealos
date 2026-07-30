const COSTCENTER_APP_KEY = 'system-costcenter';
const BRAIN_APP_KEY = 'system-brain';

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
