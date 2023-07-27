import axios, { AxiosResponse } from 'axios';
export const request = axios.create({
  baseURL: 'http://localhost:3000/',
  timeout: 10000
});

// response interceptor
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;
    return data;
  },
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject('cancel request' + String(error));
    } else {
      error.errMessage = '请求超时或服务器异常，请检查网络或联系管理员！';
    }
    return Promise.reject(error);
  }
);

export default request;
