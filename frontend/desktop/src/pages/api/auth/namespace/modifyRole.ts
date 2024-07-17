import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { modifyBinding, modifyWorkspaceRole } from '@/services/backend/team';
import { UserRole } from '@/types/team';
import { isUserRole, roleToUserRole, vaildManage } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/services/backend/db/init';
import { validate } from 'uuid';
import { JoinStatus } from 'prisma/region/generated/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    //
    const { ns_uid, targetUserCrUid, tRole } = req.body as {
      ns_uid?: string;
      targetUserCrUid?: string;
      tRole?: UserRole;
    };
    if (!targetUserCrUid || !validate(targetUserCrUid))
      return jsonRes(res, { code: 400, message: 'tUserId is invalid' });
    if (!isUserRole(tRole)) return jsonRes(res, { code: 400, message: 'tRole is required' });
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invalid' });
    if (targetUserCrUid === payload.userCrUid)
      return jsonRes(res, { code: 403, message: 'target user is not self' });
    // 翻出utn
    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        workspaceUid: ns_uid,
        isPrivate: false,
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
    const vaildFn = vaildManage(roleToUserRole(own.role));
    const targetUser = queryResults.find((x) => x.userCrUid === targetUserCrUid);
    if (!targetUser) return jsonRes(res, { code: 404, message: 'target is not in namespace' });
    if (!vaildFn(roleToUserRole(targetUser.role), targetUser.userCrUid === own.userCrUid))
      return jsonRes(res, { code: 403, message: 'you are not manager' });

    // 权限一致，不用管
    if (roleToUserRole(targetUser.role) === tRole)
      return jsonRes(res, { code: 200, message: 'Successfully' });

    await modifyWorkspaceRole({
      k8s_username: targetUser.userCr.crName,
      role: tRole,
      action: 'Modify',
      workspaceId: targetUser.workspace.id,
      pre_role: roleToUserRole(targetUser.role)
    });
    const updateResult = await modifyBinding({
      userCrUid: targetUser.userCrUid,
      workspaceUid: targetUser.workspaceUid,
      role: tRole
    });
    if (!updateResult) throw new Error('modify utn error');
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to modify member role' });
  }
}
