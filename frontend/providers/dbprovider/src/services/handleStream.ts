import { getUserKubeConfig } from '@/utils/user';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import stream, { Transform } from 'stream';
import { authSession } from './backend/auth';

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
    const doMain = process.env.MONITOR_URL || 'http://monitor-system.cloud.sealos.run';
    const response = await fetch(`${doMain}${url}?${queryString}`, requestOptions).then((res) => {
      console.log(res, '====');

      return res.json();
    });
    console.log(`${doMain}${url}?${queryString}`, response);
    return response;
    // const response = await axios({
    //   baseURL: 'http://localhost:9090' || 'http://monitor-system.cloud.sealos.run',
    //   // responseType: 'stream',
    //   method: 'GET',
    //   headers: {
    //     Authorization: encodeURIComponent(kubeconfig)
    //   },
    //   ...props
    // });
    // const dataStream = response.data;

    // if (!(dataStream instanceof stream.Readable)) {
    //   throw new Error('Response is not a readable stream');
    // }

    // const transformStream = new Transform({
    //   transform(chunk, encoding, callback) {
    //     this.push(chunk);
    //     callback();
    //   }
    // });

    // return new Promise((resolve, reject) => {
    //   let data = '';

    //   transformStream.on('data', (chunk) => (data += chunk));
    //   transformStream.on('end', () => resolve(JSON.parse(data)));
    //   transformStream.on('error', reject);

    //   dataStream.pipe(transformStream);
    // });
  } catch (error) {
    // console.log(error, '=========');
    throw error;
  }
};
