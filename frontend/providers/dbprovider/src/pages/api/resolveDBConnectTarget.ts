import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode } from '@/types/response';
import type { ApiResp } from '@/services/kubernet';
import {
  selectConnectPodFromMembersStatus,
  type InstanceSetMemberStatus,
  type ResolveDBConnectTargetResponse
} from '@/utils/database';
import type { DBComponentsName } from '@/types/db';

const INSTANCE_SET_GROUP = 'workloads.kubeblocks.io';
const INSTANCE_SET_PLURAL = 'instancesets';
const INSTANCE_SET_VERSIONS = ['v1', 'v1alpha1'] as const;

type InstanceSetLike = {
  status?: {
    membersStatus?: InstanceSetMemberStatus[];
  };
};

const readInstanceSet = async ({
  component,
  dbName,
  req
}: {
  component: DBComponentsName;
  dbName: string;
  req: NextApiRequest;
}) => {
  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });
  const name = `${dbName}-${component}`;
  let lastError: unknown;

  for (const version of INSTANCE_SET_VERSIONS) {
    try {
      const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
        INSTANCE_SET_GROUP,
        version,
        namespace,
        INSTANCE_SET_PLURAL,
        name
      )) as {
        body: InstanceSetLike;
      };

      return body;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp<ResolveDBConnectTargetResponse>>
) {
  try {
    const { dbName, component } = req.query as {
      dbName?: string;
      component?: DBComponentsName;
    };

    if (!dbName || !component) {
      return jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        message: 'dbName and component are required'
      });
    }

    const instanceSet = await readInstanceSet({
      dbName,
      component,
      req
    });
    const podName = selectConnectPodFromMembersStatus(instanceSet.status?.membersStatus);

    return jsonRes(res, {
      data: {
        podName
      }
    });
  } catch (error) {
    return jsonRes(res, {
      ...handleK8sError(error),
      error
    });
  }
}
