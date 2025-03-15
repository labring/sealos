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

  const doMain = process.env.MONITOR_URL || 'http://monitor-system.cloud.sealos.run';

  try {
    const response = await fetch(`${doMain}${url}?${queryString}`, requestOptions);

    if (!response.ok) {
      throw new Error(`Error monitorFetch ${response.status}`);
    }

    const jsonResponse = await response.json();
    return jsonResponse;
  } catch (error) {
    throw error;
  }
};
