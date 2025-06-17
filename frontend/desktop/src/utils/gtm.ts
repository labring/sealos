export const gtmLoginStart = () =>
  window?.dataLayer?.push?.({
    event: 'login_start',
    module: 'auth',
    context: 'app'
  });
export const gtmLoginSuccess = ({
  method,
  user_type
}: {
  method: 'email' | 'gmail' | 'github' | 'unknown';
  user_type: 'new' | 'returning';
}) =>
  window?.dataLayer?.push({
    event: 'login_success',
    method,
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
