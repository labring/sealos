// edge
import useSessionStore from '@/store/session';
import yaml from 'js-yaml';

type KC = {
  contexts: {
    context: {
      cluster: string;
      namespace: string;
      user: string;
    };
    name: string;
  }[];
  users: {
    name: string;
    user: {
      token: string;
    };
  }[];
};

export const getUserKubeConfig = () => {
  let kubeConfig: string =
    process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '';
  try {
    const session = useSessionStore.getState()?.session;
    if (!kubeConfig && session) {
      kubeConfig = session?.kubeconfig;
    }
  } catch (err) {
    console.error(err);
  }
  return kubeConfig;
};
export const getUserNamespace = () => {
  const kubeConfig = getUserKubeConfig();
  const json = yaml.load(kubeConfig) as KC;
  return json?.contexts[0]?.context?.namespace || `ns-${json?.users[0]?.name}`;
};

export const getUserServiceAccount = () => {
  const kubeConfig = getUserKubeConfig();
  const json = yaml.load(kubeConfig) as KC;
  return json?.contexts[0]?.context?.namespace?.replace('ns-', '') || `${json?.users[0]?.name}`;
};

export const getUserId = () => {
  const kubeConfig = getUserKubeConfig();
  const json = yaml.load(kubeConfig) as KC;
  return json?.contexts[0]?.context?.user || json?.users[0]?.name;
};
