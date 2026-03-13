import axios from 'axios';
import { Config } from '@/config';

export const retagSvcClient = axios.create({
  baseURL: Config().devbox.components.retagService.url,
  withCredentials: true,
  timeout: 60000
});
