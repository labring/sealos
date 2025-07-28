import yaml from 'js-yaml';
import { customAlphabet } from 'nanoid';
import { SessionV1 } from 'sealos-desktop-sdk';

export const getUserKubeConfig = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  let kubeConfig: string =
    process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '';
  try {
    const store = sessionStorage.getItem('session');
    if (!kubeConfig && store) {
      const session = JSON.parse(store) as SessionV1;
      kubeConfig = session.kubeconfig;
    }
  } catch (err) {
    err;
  }
  return kubeConfig;
};
export const getDesktopSessionFromSessionStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const store = sessionStorage.getItem('session');
    if (store) {
      const session = JSON.parse(store) as SessionV1;
      return session;
    } else {
      return null;
    }
  } catch (err) {
    console.log(err);
    return null;
  }
};
export const getSessionFromSessionStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return sessionStorage.getItem('token');
  } catch (err) {
    console.log(err);
    return null;
  }
};
export const setSessionToSessionStorage = (token: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  sessionStorage.setItem('token', token);
};
export const cleanSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  sessionStorage.removeItem('session');
  sessionStorage.removeItem('token');
};
export const getUserNamespace = () => {
  const kubeConfig = getUserKubeConfig();
  const json: any = yaml.load(kubeConfig);
  try {
    return json?.contexts[0]?.context?.namespace || `ns-${json.users[0].name}`;
  } catch (err) {
    return 'ns-';
  }
};

export const makeOrganizationName = () => {
  const gen = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 7);
  return gen();
};
