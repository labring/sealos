// edge
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
