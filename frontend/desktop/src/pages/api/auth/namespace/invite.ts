import { jsonRes } from '@/services/backend/response';
import { bindingRole } from '@/services/backend/team';
import { UserRole } from '@/types/team';
import { isUserRole, roleToUserRole, vaildManage } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { validate } from 'uuid';
import { JoinStatus } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';
import { getTeamInviteLimit } from '@/services/enable';
const TEAM_INVITE_LIMIT = getTeamInviteLimit();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid, targetUserId, role } = req.body as {
      ns_uid?: string;
      targetUserId?: string;
      role?: UserRole;
    };
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invaild' });
    if (!targetUserId) return jsonRes(res, { code: 400, message: 'targetUserId is required' });
    if (!isUserRole(role)) return jsonRes(res, { code: 400, message: 'role is required' });
    if (role === UserRole.Owner) return jsonRes(res, { code: 403, message: 'role must be others' });
    if (targetUserId === payload.userId)
      return jsonRes(res, { code: 403, message: 'target user must be others' });
    const realUser = await globalPrisma.user.findUnique({
      where: {
        name: targetUserId
      }
    });
    if (!realUser) return jsonRes(res, { code: 404, message: 'user is not found' });
    const targetRegionUser = await prisma.userCr.findUnique({
      where: {
        userUid: realUser.uid
      }
    });
    if (!targetRegionUser)
      return jsonRes(res, { code: 404, message: 'user is not in current region' });
    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        workspaceUid: ns_uid,
        status: {
          in: [JoinStatus.IN_WORKSPACE, JoinStatus.INVITED]
        }
      },
      include: {
        workspace: true,
        userCr: true
      }
    });
    const own = queryResults.find((x) => x.userCrUid === payload.userCrUid);
    if (!own) return jsonRes(res, { code: 403, message: 'you are not in the namespace' });
    if (own.isPrivate) return jsonRes(res, { code: 403, message: 'the namespace is invalid' });
    const vaild = vaildManage(roleToUserRole(own.role))(role, false);
    if (!vaild) return jsonRes(res, { code: 403, message: 'you are not manager' });
    if (queryResults.length === 0)
      return jsonRes(res, { code: 404, message: 'there are not user in the namespace ' });
    if (queryResults.length >= TEAM_INVITE_LIMIT)
      return jsonRes(res, { code: 403, message: 'the invited users are too many' });

    const tItem = queryResults.find((item) => item.userCr.uid === targetRegionUser.uid);
    if (tItem) return jsonRes(res, { code: 403, message: 'target user is already invite' });
    const result = await bindingRole({
      ns_uid,
      role,
      userCrUid: targetRegionUser.uid,
      managerId: own.userCr.userUid
    });
    if (!result) throw new Error('fail to binding role');
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'invite member error' });
  }
}
