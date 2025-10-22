import { verifyAccessToken } from '@/services/backend/auth';
import { prisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import { modifyBinding, modifyWorkspaceRole } from '@/services/backend/team';
import { UserRole } from '@/types/team';
import { isUserRole, roleToUserRole, vaildManage } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { JoinStatus } from 'prisma/region/generated/client';
import { validate } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    //
    const { ns_uid, targetUserCrUid, alias } = req.body as {
      ns_uid?: string;
      targetUserCrUid?: string;
      alias?: string | null;
    };
    if (!targetUserCrUid || !validate(targetUserCrUid))
      return jsonRes(res, { code: 400, message: 'tUserId is invalid' });
    if (typeof alias !== 'string' && alias !== null)
      return jsonRes(res, { code: 400, message: 'alias is required' });
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invalid' });

    //  get utn
    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        workspaceUid: ns_uid,
        userCrUid: {
          in: [payload.userCrUid, targetUserCrUid]
        },
        status: JoinStatus.IN_WORKSPACE
      },
      include: {
        workspace: true,
        userCr: true
      }
    });
    const own = queryResults.find((x) => x.userCrUid === payload.userCrUid);
    if (!own) return jsonRes(res, { code: 403, message: 'you are not in namespace' });
    const targetUser = queryResults.find((x) => x.userCrUid === targetUserCrUid);
    if (!targetUser) return jsonRes(res, { code: 404, message: 'target is not in namespace' });
    if (roleToUserRole(own.role) !== UserRole.Owner)
      return jsonRes(res, { code: 403, message: 'you are not owner' });

    // if role is same, do nothing
    if (targetUser.alias === alias) return jsonRes(res, { code: 200, message: 'Successfully' });

    const updateResult = await prisma.userWorkspace.update({
      where: {
        uid: targetUser.uid
      },
      data: {
        alias: alias
      }
    });

    if (!updateResult) throw new Error('modify member alias error');
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to modify member alias' });
  }
}
