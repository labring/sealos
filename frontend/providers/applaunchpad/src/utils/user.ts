// use client;
import yaml from 'js-yaml';

export const getUserKubeConfig = () => {
  let kubeConfig: string = '';
  //process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '';

  try {
    const store = localStorage.getItem('session');

    if (!kubeConfig && store) {
      kubeConfig = JSON.parse(store)?.state.session.kubeconfig;
    }
  } catch (err) {
    err;
  }
  return kubeConfig;
};

export const getUserNamespace = () => {
  const kubeConfig: any = getUserKubeConfig();
  console.log('getuserns-kubeConfig:', kubeConfig);
  try {
    return kubeConfig?.contexts[0]?.context?.namespace || 'default';
  } catch (err) {
    console.log('getuserns-err:', err);
    return 'nx-';
  }
};

export const getCurrentNamespace = (namespace: string) => {
  console.log('getCurrentNamespace-namespace:', namespace);
  if (namespace === 'default') {
    const ns = getUserNamespace();
    console.log('ns:', ns);
    return ns;
  }
  return namespace;
};

export const setUserIsLogin = (isLogin: boolean, session: string) => {
  localStorage.setItem('user-login', isLogin.toString());
  if (isLogin) {
    localStorage.setItem('session', session);
  } else {
    localStorage.removeItem('session');
  }
};

export const setMenuList = (menuList: any) => {
  localStorage.setItem('user-menu',JSON.stringify(menuList));
};

export const getMenuList = () => {
  try {
    return JSON.parse(localStorage.getItem('user-menu'));
  } catch (err) {
    return null;
  }
};

export const getUserIsLogin = (): boolean => {
  const loginState = localStorage.getItem('user-login');
  return loginState === 'true';
};
