import { jsonRes } from '@/services/backend/response';
import { bindingRole } from '@/services/backend/team';
import { UserRole } from '@/types/team';
import { isUserRole, roleToUserRole, vaildManage } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { v4, validate } from 'uuid';
import { JoinStatus } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';
import { getTeamInviteLimit } from '@/services/enable';
const TEAM_INVITE_LIMIT = getTeamInviteLimit();
import { Role } from 'prisma/region/generated/client';
import { addOrUpdateInviteCode } from '@/services/backend/db/workspaceInviteCode';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid, role } = req.body as {
      ns_uid?: string;
      role?: UserRole;
    };
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invaild' });
    if (!isUserRole(role)) return jsonRes(res, { code: 400, message: 'role is required' });
    if (role === UserRole.Owner) return jsonRes(res, { code: 403, message: 'role must be others' });

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
    const vaild = ([Role.OWNER, Role.MANAGER] as Role[]).includes(own.role);
    if (!vaild) return jsonRes(res, { code: 403, message: 'you are not manager' });
    if (queryResults.length >= TEAM_INVITE_LIMIT)
      return jsonRes(res, { code: 403, message: 'these invitees are too many' });
    const spec = {
      inviterUid: payload.userUid,
      workspaceUid: ns_uid,
      inviterCrUid: payload.userCrUid,
      role
    };
    const code = v4();
    const result = await addOrUpdateInviteCode({
      ...spec,
      code
    });
    if (!result) throw Error('invite member error');
    return jsonRes(res, {
      code: 200,
      data: {
        code
      },
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    return jsonRes(res, { code: 500, message: 'invite member error' });
  }
}
