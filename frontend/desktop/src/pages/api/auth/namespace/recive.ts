import { jsonRes } from '@/services/backend/response';
import { teamMessageDto } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { roleToUserRole } from '@/utils/tools';
import { isString } from 'lodash';
import { JoinStatus } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        status: JoinStatus.INVITED,
        userCrUid: payload.userCrUid
      },
      include: {
        workspace: true
      }
    });
    const handlers = await globalPrisma.user.findMany({
      where: {
        uid: {
          in: queryResults.flatMap((q) => (isString(q.handlerUid) ? [q.handlerUid] : []))
        }
      }
    });
    const messages = queryResults.map<teamMessageDto>((x) => {
      const manager = handlers.find((h) => h.uid === x.handlerUid);
      return {
        nsid: x.workspace.id,
        ns_uid: x.workspace.uid,
        teamName: x.workspace.displayName,
        role: roleToUserRole(x.role),
        managerName: manager?.nickname || ''
      };
    });
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        messages
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'list reciveMessage error' });
  }
}
