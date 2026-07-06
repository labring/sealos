// Legacy GTM v1 events
import { ProductUserTraits } from '@/types/analytics';

/** @deprecated */
export const gtmLoginStart = () =>
  window?.dataLayer?.push?.({
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
  window?.dataLayer?.push?.({
    event: 'login_success',
    method,
    oauth2_provider: oauth2Provider,
    user_type,
    module: 'auth',
    context: 'app',
    ...productUserTraits
  });
