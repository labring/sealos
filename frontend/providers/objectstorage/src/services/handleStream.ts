import axios, { AxiosRequestConfig } from 'axios';
import stream, { Transform } from 'stream';

export const handleAxiosStream = async (props: AxiosRequestConfig, kubeconfig: string) => {
  try {
    const response = await axios({
      baseURL:
        process.env.NODE_ENV === 'development'
          ? 'https://database-monitor.dev.sealos.top/q'
          : 'http://prometheus-kube-prometheus-prometheus.monitor-system.svc.cluster.local:9090',
      // responseType: 'stream',
      method: 'GET',
      headers: {
        Authorization: encodeURIComponent(kubeconfig)
      },
      ...props
    });
    return response;
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
