import { NextApiRequest, NextApiResponse } from 'next';
import { HttpStatusCode } from 'axios';
import { verifyGlobalToken, verifyRegionalJwt } from '@/services/backend/auth';
import { getRegionToken } from '@/services/backend/regionAuth';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { jsonRes } from '@/services/backend/response';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { AccessTokenPayload } from '@/types/token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const oauth2Payload = await verifyGlobalToken(req.headers);

    if (!oauth2Payload) {
      return jsonRes(res, {
        code: HttpStatusCode.Unauthorized,
        message: 'invalid token'
      });
    }

    const regionData = await getRegionToken({
      userUid: oauth2Payload.userUid,
      userId: oauth2Payload.userId
    });
    if (!regionData) {
      return jsonRes(res, {
        code: HttpStatusCode.Conflict,
        message: 'workspace is not inited'
      });
    }

    const regionPayload = await verifyRegionalJwt<AccessTokenPayload>(regionData.token);
    if (!regionPayload) {
      throw new Error('Failed to parse regional token after region token exchange');
    }

    const defaultKubeconfig = await getUserKubeconfigNotPatch(regionPayload.userCrName);
    if (!defaultKubeconfig) {
      throw new Error('get kubeconfig error, regionUserUid: ' + regionPayload.userCrUid);
    }

    const kubeconfig = switchKubeconfigNamespace(defaultKubeconfig, regionPayload.workspaceId);
    return jsonRes(res, {
      code: HttpStatusCode.Ok,
      message: 'Successfully',
      data: {
        kubeconfig
      }
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to get default kubeconfig',
      code: HttpStatusCode.InternalServerError
    });
  }
}
