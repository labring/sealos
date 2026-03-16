import axios from 'axios';
import { Config } from '@/config';

let cachedRetagSvcClient: ReturnType<typeof axios.create> | null = null;

export const getRetagSvcClient = () => {
  if (cachedRetagSvcClient) {
    return cachedRetagSvcClient;
  }

  cachedRetagSvcClient = axios.create({
    baseURL: Config().devbox.components.retagService.url,
    withCredentials: true,
    timeout: 60000
  });

  return cachedRetagSvcClient;
};
