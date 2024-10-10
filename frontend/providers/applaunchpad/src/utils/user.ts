// use client;
import yaml from 'js-yaml';

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
    return 'nx-';
  }
};

export const setUserIsLogin = (isLogin: boolean) => {
  localStorage.setItem('user-login', isLogin.toString());
};

export const getUserIsLogin = (): boolean => {
  const loginState = localStorage.getItem('user-login');
  return loginState === 'true';
};
