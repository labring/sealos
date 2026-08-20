import { AxiosRequestConfig } from 'axios';
import { Config } from '@/config';

export const logFetch = async (props: AxiosRequestConfig, kubeconfig: string) => {
  const { url, params } = props;
  const queryString = typeof params === 'object' ? new URLSearchParams(params).toString() : params;
  const requestOptions = {
    method: 'GET',
    headers: {
      Authorization: encodeURIComponent(kubeconfig)
    }
  };

  // Yes, this API intentionally uses monitoring URL.
  const domain = Config().launchpad.components.monitoring.url;

  try {
    const response = await fetch(`${domain}${url}?${queryString}`, requestOptions);

    if (!response.ok) {
      throw new Error(`Error monitorFetch ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};
