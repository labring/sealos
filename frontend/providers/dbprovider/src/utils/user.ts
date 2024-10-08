'client';
import yaml from 'js-yaml';
import { SessionV1 } from 'sealos-desktop-sdk/*';

export const getUserKubeConfig = () => {
  let kubeConfig: string =
    process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '';

  try {
    const store = localStorage.getItem('session');
    if (!kubeConfig && store) {
      kubeConfig = JSON.parse(store)?.kubeconfig;
    }
  } catch (err) {
    err;
  }
  return kubeConfig;
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

export const getUserSession = () => {
  try {
    const store = localStorage.getItem('session');
    if (store) {
      return JSON.parse(store) as SessionV1;
    }
    return null;
  } catch (err) {
    return null;
  }
};
