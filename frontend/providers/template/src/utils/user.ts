import useSessionStore from '@/store/session';
import { SessionV1 } from 'sealos-desktop-sdk/*';

// edge
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
