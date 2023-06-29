// for service
export const enablePassword = () => process.env.PASSWORD_ENABLED === 'true' && !!process.env.PASSWORD_SALT;
export const enableGithub = () => process.env.GITHUB_ENABLED === 'true' && !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;
export const enableSms = () => process.env.SMS_ENABLED === 'true' && !!process.env.ALI_ACCESS_KEY_ID &&
    !!process.env.ALI_ACCESS_KEY_SECRET &&
    !!process.env.ALI_SIGN_NAME &&
    !!process.env.ALI_TEMPLATE_CODE
export const enableWechat = () => process.env.WECHAT_ENABLED === 'true' && !!process.env.WECHAT_CLIENT_ID && !!process.env.WECHAT_CLIENT_SECRET;