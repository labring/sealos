import { getUserKubeConfig } from '@/utils/user';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import stream, { Transform } from 'stream';
import { authSession } from './backend/auth';

export const handleAxiosStream = async (props: AxiosRequestConfig, kubeconfig: string) => {
  try {
    const response = await axios({
      baseURL: process.env.MONITOR_URL || 'http://monitor-system.cloud.sealos.run',
      responseType: 'stream',
      method: 'GET',
      headers: {
        Authorization: encodeURIComponent(kubeconfig)
      },
      ...props
    });

    const dataStream = response.data;

    if (!(dataStream instanceof stream.Readable)) {
      throw new Error('Response is not a readable stream');
    }

    const transformStream = new Transform({
      transform(chunk, encoding, callback) {
        this.push(chunk);
        callback();
      }
    });

    return new Promise((resolve, reject) => {
      let data = '';

      transformStream.on('data', (chunk) => (data += chunk));
      transformStream.on('end', () => resolve(JSON.parse(data)));
      transformStream.on('error', reject);

      dataStream.pipe(transformStream);
    });
  } catch (error) {
    throw error;
  }
};
