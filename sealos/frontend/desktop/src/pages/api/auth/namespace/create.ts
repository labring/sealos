import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { getTeamKubeconfig } from '@/services/backend/kubernetes/admin';
import { GetUserDefaultNameSpace } from '@/services/backend/kubernetes/user';
import { get_k8s_username } from '@/services/backend/regionAuth';
import { jsonRes } from '@/services/backend/response';
import { bindingRole, modifyWorkspaceRole } from '@/services/backend/team';
import { getRegionUid, getTeamLimit } from '@/services/enable';
import { NSType, NamespaceDto, UserRole } from '@/types/team';
import { UserRoleToRole } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { v4 } from 'uuid';

// const TEAM_LIMIT = getTeamLimit();
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { teamName } = req.body as { teamName?: string };
    if (!teamName) return jsonRes(res, { code: 400, message: 'teamName is required' });
    const currentNamespaces = await prisma.userWorkspace.findMany({
      where: {
        userCrUid: payload.userCrUid,
        status: 'IN_WORKSPACE'
      },
      include: {
        workspace: {
          select: {
            displayName: true
          }
        }
      }
    });

    // 校验 同名 workspace
    const alreadyNamespace = currentNamespaces.findIndex((utn) => {
      const res = utn.workspace.displayName === teamName;
      return res;
    });
    if (alreadyNamespace > -1)
      return jsonRes(res, { code: 409, message: 'The team is already exist' });
    const user = await prisma.userCr.findUnique({
      where: {
        userUid: payload.userUid,
        uid: payload.userCrUid
      }
    });
    if (!user) throw new Error('fail to get user');

    const workspace_creater = await get_k8s_username();
    if (!workspace_creater) throw new Error('fail to get workspace_creater');
    const workspaceId = GetUserDefaultNameSpace(workspace_creater);

    const workspaceUid = v4();
    const regionUid = getRegionUid();
    // 校验user 套餐
    // sync status, user add 1,
    const status = await globalPrisma.$transaction<
      'success' | 'user_not_found' | 'subscription_not_found' | 'max_workspaces_reached'
    >(async (tx) => {
      const userState = await tx.user.findUnique({
        where: {
          uid: payload.userUid
        },
        select: {
          WorkspaceUsage: true
        }
      });
      if (!userState) {
        // jsonRes(res, { code: 404, message: 'The targetUser is not found' });
        return 'user_not_found';
      }
      const userWorkspaceCount = userState.WorkspaceUsage.filter(
        (usage) => usage.regionUid === regionUid
      ).length;
      const specUserWorkspaceCount = userWorkspaceCount + 1;

      await tx.workspaceUsage.create({
        data: {
          userUid: payload.userUid,
          workspaceUid,
          seat: 1,
          regionUid
        }
      });
      return 'success';
    });
    if (status !== 'success') {
      if (status === 'user_not_found')
        jsonRes(res, {
          code: 404,
          message: 'User not found'
        });
      else if (status === 'max_workspaces_reached')
        jsonRes(res, {
          code: 403,
          message: 'The targetUser has reached the maximum number of workspaces'
        });
      else if (status === 'subscription_not_found')
        jsonRes(res, { code: 403, message: 'The targetUser is not subscribed' });
      else throw Error('Unknown error');
      return;
    }
    try {
      // 创建伪user
      const creater_kc_str = await getTeamKubeconfig(workspace_creater, payload.userCrName);
      if (!creater_kc_str) throw new Error('fail to get kubeconfig');
      await modifyWorkspaceRole({
        role: UserRole.Owner,
        action: 'Create',
        workspaceId,
        k8s_username: payload.userCrName
      });
      const result = await prisma.$transaction([
        prisma.workspace.create({
          data: {
            uid: workspaceUid,
            id: workspaceId,
            displayName: teamName
          }
        }),
        prisma.userWorkspace.create({
          data: {
            status: JoinStatus.IN_WORKSPACE,
            role: Role.OWNER,
            isPrivate: false,
            userCrUid: payload.userCrUid,
            joinAt: new Date(),
            workspaceUid
          }
        })
      ]);
      const workspace = result[0];
      return jsonRes<{ namespace: NamespaceDto }>(res, {
        code: 200,
        message: 'Successfully',
        data: {
          namespace: {
            role: UserRole.Owner,
            createTime: workspace!.createdAt,
            uid: workspace!.uid,
            id: workspace!.id,
            nstype: NSType.Team,
            teamName: workspace!.displayName
          }
        }
      });
    } catch (e) {
      // 补偿事务
      await globalPrisma.workspaceUsage.delete({
        where: {
          regionUid_userUid_workspaceUid: {
            userUid: payload.userUid,
            workspaceUid,
            regionUid
          }
        }
      });
      throw Error(String(e));
    }
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'failed to create team' });
  }
}
