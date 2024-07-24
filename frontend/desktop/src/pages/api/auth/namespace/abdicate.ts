import { jsonRes } from '@/services/backend/response';
import { modifyWorkspaceRole } from '@/services/backend/team';
import { UserRole } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/services/backend/db/init';
import { retrySerially } from '@/utils/tools';
import { validate as uuidValidate } from 'uuid';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid, targetUserCrUid } = req.body as {
      ns_uid?: string;
      targetUserCrUid?: string;
    };
    if (!ns_uid || !uuidValidate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invaild' });
    if (!targetUserCrUid || !uuidValidate(targetUserCrUid))
      return jsonRes(res, { code: 400, message: 'targetUserId is invaild' });
    if (targetUserCrUid === payload.userCrUid)
      return jsonRes(res, { code: 409, message: "the targetUserId can't be self" });
    // 校检自身user
    const workspaceToRegionUsers = await prisma.userWorkspace.findMany({
      where: {
        userCrUid: {
          in: [payload.userCrUid, targetUserCrUid]
        },
        workspaceUid: ns_uid
      },
      include: {
        workspace: true,
        userCr: true
      }
    });
    const own = workspaceToRegionUsers.find((item) => item.userCrUid === payload.userCrUid);
    if (!own) return jsonRes(res, { code: 403, message: 'You are not in namespace' });
    if (own.isPrivate) return jsonRes(res, { code: 403, message: 'Invaild namespace' });
    if (own.role !== Role.OWNER) return jsonRes(res, { code: 403, message: 'you are not owner' });
    const target = workspaceToRegionUsers.find((item) => item.userCrUid === targetUserCrUid);
    if (!target || target.status !== JoinStatus.IN_WORKSPACE)
      return jsonRes(res, { code: 404, message: 'The targetUser is not in namespace' });
    // modify K8S
    await modifyWorkspaceRole({
      action: 'Change',
      pre_k8s_username: payload.userCrUid,
      k8s_username: target.userCr.crName,
      role: UserRole.Owner,
      workspaceId: target.workspace.id
    });
    // modify db
    await retrySerially(
      () =>
        prisma.$transaction(async (tx) => {
          const result1 = await tx.userWorkspace.update({
            where: {
              workspaceUid_userCrUid: {
                workspaceUid: ns_uid,
                userCrUid: targetUserCrUid
              }
            },
            data: {
              role: Role.OWNER
            }
          });
          if (!result1) throw Error();
          const result2 = await tx.userWorkspace.update({
            where: {
              workspaceUid_userCrUid: {
                workspaceUid: ns_uid,
                userCrUid: payload.userCrUid
              }
            },
            data: {
              role: Role.DEVELOPER
            }
          });
          if (!result2) throw Error();
        }),
      3
    );
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'adbication error' });
  }
}
