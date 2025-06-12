import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import { modifyWorkspaceRole } from '@/services/backend/team';
import { getRegionUid } from '@/services/enable';
import { UserRole } from '@/types/team';
import { retrySerially } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { validate as uuidValidate } from 'uuid';

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
    // 校验target user 套餐
    const targetUser = await globalPrisma.user.findUnique({
      where: {
        uid: target.userCr.userUid
      },
      select: {
        WorkspaceUsage: true
      }
    });
    if (!targetUser) return jsonRes(res, { code: 404, message: 'The targetUser is not found' });

    // now count
    const targetUserWorkspaceCount = targetUser.WorkspaceUsage.filter(
      (usage) => usage.regionUid === getRegionUid()
    ).length;
    const newWorkspaceCount = targetUserWorkspaceCount + 1;

    const seat = workspaceToRegionUsers.length;

    const regionUid = getRegionUid();
    const currentWorkspaceUsage = targetUser.WorkspaceUsage.find((usage) => {
      return usage.workspaceUid === ns_uid && usage.regionUid === getRegionUid();
    });
    // if (!currentWorkspaceUsage) {
    //   return jsonRes(res, { code: 409, message: current })
    // }
    // 先标记状态
    const globalState = await globalPrisma.$transaction([
      globalPrisma.workspaceUsage.create({
        data: {
          userUid: target.userCr.userUid,
          workspaceUid: ns_uid,
          seat,
          regionUid
        }
      }),
      globalPrisma.workspaceUsage.delete({
        where: {
          regionUid_userUid_workspaceUid: {
            userUid: payload.userUid,
            workspaceUid: ns_uid,
            regionUid
          }
        }
      })
    ]);
    try {
      // sync status, targetUser add 1, user sub 1
      // modify K8S
      await modifyWorkspaceRole({
        action: 'Change',
        pre_k8s_username: payload.userCrName,
        k8s_username: target.userCr.crName,
        role: UserRole.Owner,
        workspaceId: target.workspace.id
      });
      await prisma.$transaction([
        prisma.userWorkspace.update({
          where: {
            workspaceUid_userCrUid: {
              workspaceUid: ns_uid,
              userCrUid: targetUserCrUid
            }
          },
          data: {
            role: Role.OWNER
          }
        }),
        prisma.userWorkspace.update({
          where: {
            workspaceUid_userCrUid: {
              workspaceUid: ns_uid,
              userCrUid: payload.userCrUid
            }
          },
          data: {
            role: Role.DEVELOPER
          }
        })
      ]);
    } catch (e) {
      // 补偿事务
      await globalPrisma.$transaction([
        globalPrisma.workspaceUsage.create({
          data: {
            userUid: payload.userUid,
            workspaceUid: ns_uid,
            seat,
            regionUid
          }
        }),
        globalPrisma.workspaceUsage.delete({
          where: {
            regionUid_userUid_workspaceUid: {
              userUid: target.userCr.userUid,
              workspaceUid: ns_uid,
              regionUid
            }
          }
        })
      ]);
    }

    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'adbication error' });
  }
}
