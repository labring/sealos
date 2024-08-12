// for service
export const enableRealNameAuth = () => global.AppConfig.common.realNameAuthEnabled || false;
export const enablePassword = () => global.AppConfig.desktop.auth.idp.password?.enabled || false;
export const enableGithub = () => global.AppConfig.desktop.auth.idp.github?.enabled || false;
export const enableSms = () => global.AppConfig.desktop.auth.idp.sms?.ali?.enabled || false;
export const enableEmailSms = () => global.AppConfig.desktop.auth.idp.sms?.email?.enabled || false;
export const enableWechat = () => global.AppConfig.desktop.auth.idp.wechat?.enabled || false;
export const enableGoogle = () => global.AppConfig.desktop.auth.idp.google?.enabled || false;
export const enableSignUp = () => global.AppConfig.desktop.auth.signUpEnabled || false;
export const enableApi = () => global.AppConfig.common.apiEnabled || false;
export const enableOAuth2 = () => global.AppConfig.desktop.auth.idp.oauth2?.enabled || false;
export const getBillingUrl = () => global.AppConfig.desktop.auth.billingUrl || '';
export const getWorkorderUrl = () => global.AppConfig.desktop.auth.workorderUrl || '';
export const getCvmUrl = () => global.AppConfig.desktop.auth.cloudVitrualMachineUrl || '';
export const getTeamLimit = () => global.AppConfig.desktop.teamManagement?.maxTeamCount || 50;
export const getTeamInviteLimit = () =>
  global.AppConfig.desktop.teamManagement?.maxTeamMemberCount || 50;

export const getRegionUid = () => global.AppConfig.cloud.regionUID;

export const enablePersistImage = () =>
  !!process.env.OS_URL &&
  !!process.env.OS_BUCKET_NAME &&
  !!Number(process.env.OS_PORT) &&
  !!process.env.OS_ACCESS_KEY &&
  !!process.env.OS_SECRET_KEY &&
  process.env.PERSIST_AVATAR_ENABLED === 'true';
