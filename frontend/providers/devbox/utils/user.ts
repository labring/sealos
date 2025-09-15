import { useUserStore } from '@/stores/user';
import yaml from 'js-yaml';
import { customAlphabet } from 'nanoid';

export const getUserKubeConfig = () => {
  let kubeConfig: string =
    process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '';

  try {
    if (typeof window !== 'undefined') {
      return useUserStore.getState().session?.kubeconfig ?? '';
    }
  } catch (err) {
    console.log(err);
  }
  return kubeConfig;
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
