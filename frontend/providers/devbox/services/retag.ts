import axios from 'axios';

export const retagSvcClient = axios.create({
  baseURL: process.env.RETAG_SVC_URL,
  withCredentials: true,
  timeout: 60000
});
