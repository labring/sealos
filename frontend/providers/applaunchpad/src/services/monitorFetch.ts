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
  const doMain = global.AppConfig.launchpad.components.monitor.url || '';

  try {
    const response = await fetch(`${doMain}${url}?${queryString}`, requestOptions);

    if (!response.ok) {
      throw new Error(`Error monitorFetch ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};
