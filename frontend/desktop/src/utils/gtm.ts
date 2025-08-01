// Legacy GTM v1 events

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
  user_type
}: {
  method: 'phone' | 'email' | 'oauth2';
  oauth2Provider?: string;
  user_type: 'new' | 'existing';
}) =>
  window?.dataLayer?.push({
    event: 'login_success',
    method,
    oauth2_provider: oauth2Provider,
    user_type,
    module: 'auth',
    context: 'app'
  });
