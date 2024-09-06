import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { Log } from '@kubernetes/client-node';
import { PassThrough } from 'stream';

// get App Metrics By DeployName. compute average value
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  let streamResponse: any;
  const logStream = new PassThrough();

  const destroyStream = () => {
    streamResponse?.destroy();
    logStream?.destroy();
  };

  logStream.on('error', () => {
    console.log('stream error');
    destroyStream();
  });
  res.on('close', () => {
    console.log('connect close');
    destroyStream();
  });
  res.on('error', () => {
    console.log('error: ', 'request error');
    destroyStream();
  });

  try {
    const {
      appName,
      podName,
      stream = false,
      logSize,
      previous,
      sinceTime
    } = req.body as {
      appName: string;
      podName: string;
      stream: boolean;
      logSize?: number;
      previous?: boolean;
      sinceTime?: number;
    };

    if (!podName) {
      throw new Error('podName is empty');
    }

    const { kc, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    if (!stream) {
      const sinceSeconds =
        sinceTime && !!!previous ? Math.floor((Date.now() - sinceTime) / 1000) : undefined;
      // get pods
      const { body: data } = await k8sCore.readNamespacedPodLog(
        podName,
        namespace,
        appName,
        undefined,
        undefined,
        undefined,
        undefined,
        previous,
        sinceSeconds,
        logSize
      );
      return jsonRes(res, {
        data
      });
    }

    const logs = new Log(kc);

    res.setHeader('Content-Type', 'text/event-stream;charset-utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    logStream.pipe(res);

    const reqData = {
      follow: true,
      pretty: false,
      timestamps: false,
      tailLines: 1000,
      previous: !!previous
    } as any;
    if (!reqData.previous && sinceTime) {
      reqData.sinceTime = timestampToRFC3339(sinceTime);
    }

    if (!reqData.previous) {
      res.flushHeaders();
    }

    streamResponse = await logs.log(
      namespace,
      podName,
      appName,
      logStream,
      (err) => {
        console.log('err', err);
        destroyStream();
      },
      reqData
    );
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

function timestampToRFC3339(timestamp: number) {
  return new Date(timestamp).toISOString();
}
