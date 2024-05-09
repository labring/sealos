// for service
import process from 'process';
import { AppConfigType } from '@/types';

const config = global.AppConfig as AppConfigType;

export const enablePassword = () => config.desktop.auth.idp.password?.enabled || false;
export const enableGithub = () => config.desktop.auth.idp.github?.enabled || false;
export const enableSms = () => config.desktop.auth.idp.sms?.ali?.enabled || false;
export const enableWechat = () => config.desktop.auth.idp.wechat?.enabled || false;
export const enableGoogle = () => config.desktop.auth.idp.google?.enabled || false;
export const enableSignUp = () => config.desktop.auth.signUpEnabled || false;
export const enableApi = () => config.common.apiEnabled || false;
export const enableOAuth2 = () => config.desktop.auth.idp.oauth2?.enabled || false;

export const getTeamLimit = () => config.desktop.teamManagement?.maxTeamCount || 50;
export const getTeamInviteLimit = () => config.desktop.teamManagement?.maxTeamMemberCount || 50;

export const getRegionUid = () => config.cloud.regionUID;

export const enablePersistImage = () =>
  !!process.env.OS_URL &&
  !!process.env.OS_BUCKET_NAME &&
  !!Number(process.env.OS_PORT) &&
  !!process.env.OS_ACCESS_KEY &&
  !!process.env.OS_SECRET_KEY &&
  process.env.PERSIST_AVATAR_ENABLED === 'true';
