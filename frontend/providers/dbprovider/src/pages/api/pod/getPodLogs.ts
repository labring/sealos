import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { Log } from '@kubernetes/client-node';
import { PassThrough } from 'stream';
import { DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';

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
      dbType,
      podName,
      stream = false,
      logSize
    } = req.body as {
      dbType: `${DBTypeEnum}`;
      podName: string;
      stream: boolean;
      logSize?: number;
    };

    if (!podName) {
      throw new Error('podName is empty');
    }
    const { kc, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const containerName = DBBackupPolicyNameMap[dbType];
    console.log(containerName, 'containerName');

    if (!stream) {
      // get pods
      const { body: data } = await k8sCore.readNamespacedPodLog(
        podName,
        namespace,
        containerName,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
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

    streamResponse = await logs.log(
      namespace,
      podName,
      containerName,
      logStream,
      (err) => {
        console.log('pod log err', err);
        destroyStream();
      },
      { follow: true, pretty: false, timestamps: false, tailLines: 1000 }
    );
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
