import useSessionStore from '@/store/session';

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
