import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { assertPodExecPermission } from '@/services/backend/podExecPermission';
import { ApiResp } from '@/services/kubernet';
import { ResponseCode } from '@/types/response';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import formidable from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { PassThrough } from 'stream';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { kc, namespace, k8sExec } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const {
      containerName,
      path: encodedPath,
      podName
    } = req.query as {
      containerName: string;
      podName: string;
      path: string;
    };
    const path = decodeURIComponent(encodedPath);

    await assertPodExecPermission({ kc, namespace, podName });
    const kubefs = new KubeFileSystem(k8sExec);
    let form: any;
    let task = new Promise<string>((resolve, reject) => {
      form = formidable({
        fileWriteStreamHandler: () => {
          const pass = new PassThrough();

          kubefs
            .upload({
              namespace,
              podName,
              containerName,
              path,
              file: pass
            })
            .then(resolve)
            .catch((err) => {
              console.log(err);
              reject(`Upload API error: ${err.message}`);
            });
          return pass;
        }
      });
    });

    form.parse(req, (err: any) => {
      if (err) {
        throw new Error('Error parsing the form');
      }
    });
    await task;

    jsonRes(res, { data: 'success' });
  } catch (err: any) {
    jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
