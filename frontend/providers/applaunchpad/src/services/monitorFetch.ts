import { AxiosRequestConfig } from 'axios';
import { Config } from '@/config';

export const monitorFetch = async (props: AxiosRequestConfig, kubeconfig: string) => {
  const { url, params } = props;
  const queryString = typeof params === 'object' ? new URLSearchParams(params).toString() : params;
  const requestOptions = {
    method: 'GET',
    headers: {
      Authorization: encodeURIComponent(kubeconfig)
    }
  };
  const domain = Config().launchpad.components.monitor.url;
  try {
    const response = await fetch(`${domain}${url}?${queryString}`, requestOptions);

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
