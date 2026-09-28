// Legacy GTM v1 events
import { ProductUserTraits } from '@/types/analytics';

const pushGtmEvent = (event: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
};

/** @deprecated */
export const gtmLoginStart = () =>
  pushGtmEvent({
    event: 'login_start',
    module: 'auth',
    context: 'app'
  });

/** @deprecated */
export const gtmLoginSuccess = ({
  method,
  oauth2Provider,
  user_type,
  productUserTraits
}: {
  method: 'phone' | 'email' | 'oauth2';
  oauth2Provider?: string;
  user_type: 'new' | 'existing';
  productUserTraits?: ProductUserTraits;
}) =>
  pushGtmEvent({
    event: 'login_success',
    method,
    oauth2_provider: oauth2Provider,
    user_type,
    module: 'auth',
    context: 'app',
    ...productUserTraits
  });

/** Records website token logins only; other token redirects can switch regions. */
export const gtmWebsiteTokenLoginSuccess = ({
  source,
  userType,
  productUserTraits
}: {
  source: unknown;
  userType: unknown;
  productUserTraits: ProductUserTraits;
}) => {
  if (
    (source !== 'email' && source !== 'google_one_tap') ||
    (userType !== 'new' && userType !== 'existing')
  ) {
    return;
  }

  gtmLoginSuccess({
    method: source === 'email' ? 'email' : 'oauth2',
    oauth2Provider: source === 'google_one_tap' ? 'GOOGLE' : undefined,
    user_type: userType,
    productUserTraits
  });
};
