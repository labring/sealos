import type { NextApiRequest, NextApiResponse } from 'next';
import * as k8s from '@kubernetes/client-node';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode } from '@/types/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { podName } = req.query as { podName: string };
    if (!podName) {
      return jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        message: 'podName is empty'
      });
    }

    const { kc, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    const authorizationApi = kc.makeApiClient(k8s.AuthorizationV1Api);
    const {
      body: { status }
    } = await authorizationApi.createSelfSubjectAccessReview({
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectAccessReview',
      spec: {
        resourceAttributes: {
          namespace,
          verb: 'create',
          resource: 'pods',
          subresource: 'exec',
          name: podName
        }
      }
    });

    if (!status?.allowed) {
      return jsonRes(res, {
        code: ResponseCode.FORBIDDEN,
        message: 'Insufficient permissions'
      });
    }

    jsonRes(res, { data: { allowed: true } });
  } catch (err: any) {
    jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}
