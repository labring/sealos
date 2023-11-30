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
