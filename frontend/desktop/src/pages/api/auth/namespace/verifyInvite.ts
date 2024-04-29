import { reciveAction } from '@/api/namespace';
import { jsonRes } from '@/services/backend/response';
import { acceptInvite, modifyWorkspaceRole, unbindingRole } from '@/services/backend/team';

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/services/backend/db/init';
import { roleToUserRole } from '@/utils/tools';
import { validate } from 'uuid';
import { JoinStatus } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });

    const { ns_uid, action } = req.body as { ns_uid?: string; action: reciveAction };
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invalid' });
    if (![reciveAction.Accepte, reciveAction.Reject].includes(action))
      return jsonRes(res, {
        code: 400,
        message: `action must be ${reciveAction.Accepte}, ${reciveAction.Reject}`
      });
    const queryStatus = await prisma.userWorkspace.findUnique({
      where: {
        workspaceUid_userCrUid: {
          workspaceUid: ns_uid,
          userCrUid: payload.userCrUid
        },
        isPrivate: false,
        status: JoinStatus.INVITED
      },
      include: {
        userCr: true,
        workspace: true
      }
    });
    if (!queryStatus) return jsonRes(res, { code: 404, message: "You're not invited" });
    if (action === reciveAction.Accepte) {
      await modifyWorkspaceRole({
        k8s_username: queryStatus.userCr.crName,
        role: roleToUserRole(queryStatus.role),
        workspaceId: queryStatus.workspace.id,
        action: 'Grant'
      });
      const result = await acceptInvite({
        userCrUid: payload.userCrUid,
        workspaceUid: ns_uid
      });
      if (!result) throw new Error('failed to change Status');
    } else if (action === reciveAction.Reject) {
      const unbindingResult = await unbindingRole({
        workspaceUid: ns_uid,
        userCrUid: payload.userCrUid
      });
      if (!unbindingResult) throw new Error('fail to unbinding');
    }
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}
