import { Config } from '@/config';
import { AxiosRequestConfig } from 'axios';

export const handleAxiosStream = async (props: AxiosRequestConfig, kubeconfig: string) => {
  try {
    const { url, params } = props;
    const queryString = new URLSearchParams(params).toString();
    const requestOptions = {
      method: 'GET',
      headers: {
        Authorization: encodeURIComponent(kubeconfig)
      }
    };
    const domain = Config().dbprovider.components.monitoring.url;
    const response = await fetch(`${domain}${url}?${queryString}`, requestOptions).then((res) =>
      res.json()
    );
    return response;
  } catch (error) {
    console.log('===monitor===\n', error);
    throw error;
  }
};
