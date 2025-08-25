import { AxiosRequestConfig } from 'axios';

export const monitorFetch = async (props: AxiosRequestConfig, kubeconfig: string) => {
  const { url, params } = props;
  const queryString = typeof params === 'object' ? new URLSearchParams(params).toString() : params;
  const requestOptions = {
    method: 'GET',
    headers: {
      Authorization: encodeURIComponent(kubeconfig)
    }
  };
  const doMain =
    global.AppConfig.launchpad.components.monitor.url ||
    'http://launchpad-monitor.sealos.svc.cluster.local:8428';

  try {
    const response = await fetch(`${doMain}${url}?${queryString}`, requestOptions);

    if (!response.ok) {
      throw new Error(`Error monitorFetch ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Please check if monitor service api is configured:');
    }
    throw error;
  }
};
