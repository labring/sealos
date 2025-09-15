// use client;
import { useUserStore } from '@/store/user';
import yaml from 'js-yaml';
import { SessionV1 } from 'sealos-desktop-sdk/*';

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

export const getUserSession = () => {
  try {
    if (typeof window !== 'undefined') {
      return useUserStore.getState().session;
    }
  } catch (err) {
    return null;
  }
};

export const getUserNamespace = () => {
  const kubeConfig = getUserKubeConfig();

  const json: any = yaml.load(kubeConfig);
  try {
    return json?.contexts[0]?.context?.namespace || `ns-${json.users[0].name}`;
  } catch (err) {
    return 'nx-';
  }
};
