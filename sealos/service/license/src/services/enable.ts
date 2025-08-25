// for service
export const enablePassword = () =>
  process.env.PASSWORD_ENABLED === 'true' && !!process.env.PASSWORD_SALT;
export const enableGithub = () =>
  process.env.GITHUB_ENABLED === 'true' &&
  !!process.env.GITHUB_CLIENT_ID &&
  !!process.env.GITHUB_CLIENT_SECRET;
export const enableSms = () =>
  process.env.SMS_ENABLED === 'true' &&
  !!process.env.ALI_ACCESS_KEY_ID &&
  !!process.env.ALI_ACCESS_KEY_SECRET &&
  !!process.env.ALI_SIGN_NAME &&
  !!process.env.ALI_TEMPLATE_CODE;
export const enableWechat = () =>
  process.env.WECHAT_ENABLED === 'true' &&
  !!process.env.WECHAT_CLIENT_ID &&
  !!process.env.WECHAT_CLIENT_SECRET;
export const enableGoogle = () =>
  process.env.GOOGLE_ENABLED === 'true' &&
  !!process.env.GOOGLE_CLIENT_ID &&
  !!process.env.GOOGLE_CLIENT_SECRET;
export const enableRecharge = () => {
  return process.env.RECHARGE_ENABLED === 'true';
};
// pay type
export const enableStripe = () =>
  process.env['STRIPE_ENABLED'] === 'true' && !!process.env['STRIPE_PUB'];
export const enableWechatRecharge = () => process.env['WECHAT_ENABLED'] === 'true';
// sealos pay
export const enableSealosPay = () =>
  process.env.SEALOS_PAY_ID && process.env.SEALOS_PAY_KEY && process.env.SEALOS_PAY_UEL;
