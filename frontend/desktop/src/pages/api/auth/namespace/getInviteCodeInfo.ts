import { jsonRes } from '@/services/backend/response';
import { roleToUserRole, vaildManage } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { verifyAccessToken } from '@/services/backend/auth';
import { findInviteCode } from '@/services/backend/db/workspaceInviteCode';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { code } = req.body as {
      code?: string;
    };
    if (!code) return jsonRes(res, { code: 400, message: 'code is required' });
    const linkResults = await findInviteCode(code);
    if (!linkResults) return jsonRes(res, { code: 404, message: 'the link is not found' });

    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        workspaceUid: linkResults.workspaceUid,
        userCrUid: {
          in: [linkResults.inviterCrUid, payload.userCrUid]
        }
      },
      include: {
        workspace: true,
        userCr: true
      }
    });
    const inviteeStatus = queryResults.find((item) => item.userCrUid === payload.userCrUid);
    if (inviteeStatus) return jsonRes(res, { code: 204, message: 'you are already in namespace' });
    const inviterStatus = queryResults.find((r) => r.userCrUid === linkResults.inviterCrUid);
    if (!inviterStatus || !vaildManage(roleToUserRole(inviterStatus.role))(linkResults.role, false))
      return jsonRes(res, { code: 404, message: 'the inviter or the namespace is not found' });
    const user = await globalPrisma.user.findUnique({
      where: {
        uid: inviterStatus.userCr.userUid
      }
    });
    if (!user) throw Error('invalid user');
    return jsonRes(res, {
      code: 200,
      data: {
        workspace: inviterStatus.workspace.displayName,
        role: linkResults.role,
        inviterNickname: user.nickname
      },
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'invite member error' });
  }
}
