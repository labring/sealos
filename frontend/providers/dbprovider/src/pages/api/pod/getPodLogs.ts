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
  try {
    const { kc, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const {
      dbType,
      podName,
      stream = false,
      logSize,
      previous,
      sinceTime
    } = req.body as {
      dbType: `${DBTypeEnum}`;
      podName: string;
      stream: boolean;
      logSize?: number;
      previous?: boolean;
      sinceTime?: number;
    };

    if (!podName) {
      throw new Error('podName is empty');
    }

    const containerName = await resolveContainerName({
      k8sCore,
      namespace,
      podName,
      dbType
    });

    console.log(containerName, 'containerName');

    if (!stream) {
      const sinceSeconds =
        sinceTime && !!!previous ? Math.floor((Date.now() - sinceTime) / 1000) : undefined;
      try {
        const { body: data } = await k8sCore.readNamespacedPodLog(
          podName,
          namespace,
          containerName,
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
      } catch (error: any) {
        return jsonRes(res, {
          code: 500,
          error
        });
      }
    }

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

    res.setHeader('Content-Type', 'text/event-stream;charset-utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    res.flushHeaders();

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

    const logs = new Log(kc);
    try {
      streamResponse = await logs.log(
        namespace,
        podName,
        containerName,
        logStream,
        (err) => {
          if (err) {
            console.log('err', err);
            res.write(err.toString());
          }
          destroyStream();
        },
        reqData
      );
    } catch (err: any) {}
  } catch (error: any) {
    if (!res.headersSent) {
      jsonRes(res, {
        code: 500,
        error
      });
    }
  }
}

function timestampToRFC3339(timestamp: number) {
  return new Date(timestamp).toISOString();
}

async function resolveContainerName({
  k8sCore,
  namespace,
  podName,
  dbType
}: {
  k8sCore: any;
  namespace: string;
  podName: string;
  dbType: `${DBTypeEnum}`;
}) {
  const preferredContainerName = DBBackupPolicyNameMap[dbType];
  const { body: pod } = await k8sCore.readNamespacedPod(podName, namespace);
  const podContainerNames = pod.spec?.containers?.map((container: any) => container.name) || [];

  if (preferredContainerName && podContainerNames.includes(preferredContainerName)) {
    return preferredContainerName;
  }

  const firstContainerName = podContainerNames[0];
  if (firstContainerName) {
    return firstContainerName;
  }

  throw new Error(`No containers found for pod: ${podName}`);
}
