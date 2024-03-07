import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/services/backend/db/init';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { switchKubeconfigNamespace } from '@/services/backend/kubernetes/user';
import { validate } from 'uuid';
import { JoinStatus } from 'prisma/region/generated/client';
import { generateAccessToken, verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid } = req.body as {
      ns_uid?: string;
    };
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invalid' });
    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        userCrUid: payload.userCrUid,
        status: JoinStatus.IN_WORKSPACE
      },
      include: {
        workspace: true,
        userCr: true
      }
    });
    const curWorkspaceItem = queryResults.find(
      (item) => item.workspace.uid === payload.workspaceUid
    );
    if (!curWorkspaceItem)
      return jsonRes(res, { code: 403, message: 'You are not in this workspace' });
    const newWorkspaceItem = queryResults.find((item) => item.workspace.uid === ns_uid);
    if (!newWorkspaceItem)
      return jsonRes(res, { code: 403, message: 'You are not in this workspace' });
    const oldKcRaw = await getUserKubeconfig(payload.userCrUid, payload.userCrName);
    if (!oldKcRaw) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });
    const kubeconfig = switchKubeconfigNamespace(oldKcRaw, newWorkspaceItem.workspace.id);

    const token = generateAccessToken({
      workspaceUid: newWorkspaceItem.workspaceUid,
      workspaceId: newWorkspaceItem.workspace.id,
      regionUid: payload.regionUid,
      userCrUid: payload.userCrUid,
      userCrName: payload.userCrName,
      userId: payload.userId,
      userUid: payload.userUid
    });
    const data = {
      token,
      kubeconfig
    };
    return jsonRes(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to switch namespace' });
  }
}
