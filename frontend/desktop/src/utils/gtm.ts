export const gtmLoginStart = () =>
  window?.dataLayer?.push?.({
    event: 'login_start',
    module: 'auth',
    context: 'app'
  });
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
export const gtmOpenCostcenter = () =>
  window?.dataLayer?.push({
    event: 'module_open',
    module: 'costcenter',
    context: 'app'
  });
