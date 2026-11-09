import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { getRegionUid } from '@/services/enable';
import { GetUserDefaultNameSpace } from '@/services/backend/kubernetes/user';
import { customAlphabet } from 'nanoid';
import { retrySerially } from '@/utils/tools';
import { AccessTokenPayload } from '@/types/token';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { generateRegionalToken, generateAppToken } from '@/services/backend/auth';
import { v4 } from 'uuid';

const LetterBytes = 'abcdefghijklmnopqrstuvwxyz0123456789';
const HostnameLength = 8;

const nanoid = customAlphabet(LetterBytes, HostnameLength);

/**
 * Determines the user type based on the global subscription configuration.
 *
 * @returns {'subscription' | 'payg'} - Returns 'subscription' if subscription is enabled, otherwise 'payg'
 */
function getUserType(): 'subscription' | 'payg' {
  return global.AppConfig?.desktop?.layout?.common?.subscriptionEnabled === true
    ? 'subscription'
    : 'payg';
}

export async function get_k8s_username() {
  return await retrySerially<string | null>(async () => {
    const crName = nanoid();
    const result = await prisma.userCr.findUnique({
      where: {
        crName
      }
    });
    if (!result) return crName;
    else return Promise.reject(null);
  }, 3);
}

export async function getRegionToken({ userUid, userId }: { userUid: string; userId: string }) {
  return getRegionTokenForRegion({ userUid, userId, regionUid: getRegionUid() });
}

async function getRegionTokenForRegion({
  userUid,
  userId,
  regionUid,
  workspaceName = 'private team',
  initialize = false
}: {
  userUid: string;
  userId: string;
  regionUid: string;
  workspaceName?: string;
  initialize?: boolean;
}): Promise<{ kubeconfig: string; token: string; appToken: string } | null> {
  const region = await globalPrisma.region.findUnique({
    where: {
      uid: regionUid
    }
  });

  if (!region) {
    throw Error('The REGION_UID is undefined');
  }
  const result = await retrySerially(async () => {
    const userResult = await globalPrisma.user.findUnique({
      where: {
        uid: userUid
      },
      select: {
        userInfo: {
          select: {
            isInited: true
          }
        },
        WorkspaceUsage: true
      }
    });
    // 没有user
    if (!userResult) {
      return null;
    }
    if (initialize && !userResult.userInfo) return null;

    const regionalUser = await prisma.userCr.findUnique({
      where: { userUid },
      select: {
        userWorkspace: {
          select: {
            workspaceUid: true,
            role: true,
            status: true,
            isPrivate: true,
            workspace: {
              select: {
                uid: true,
                userWorkspace: { select: { status: true } }
              }
            }
          }
        }
      }
    });
    let needCreating = false;
    let workspaceUid: string;

    if (regionalUser) {
      const ownerWorkspaces = regionalUser.userWorkspace.filter(
        ({ role, status }) => role === Role.OWNER && status === JoinStatus.IN_WORKSPACE
      );
      const privateWorkspaces = ownerWorkspaces.filter(({ isPrivate }) => isPrivate);
      if (privateWorkspaces.length !== 1) {
        throw new Error('Expected exactly one active private workspace owner relation');
      }
      workspaceUid = privateWorkspaces[0].workspaceUid;

      // 登录只恢复真实私有空间；团队空间可能正在另一数据库中被删除或转让，
      // 不能依据读取到的旧 OWNER 快照重新创建其登记。
      const registeredWorkspaceUids = new Set(
        userResult.WorkspaceUsage.filter((u) => u.regionUid === region.uid).map(
          (u) => u.workspaceUid
        )
      );
      const missingWorkspaces = privateWorkspaces.filter(
        (w) => !registeredWorkspaceUids.has(w.workspaceUid)
      );
      if (missingWorkspaces.length > 0) {
        await globalPrisma.$transaction(
          async (tx) => {
            // Transfers update global ownership before regional roles. Do not restore
            // the old owner's usage while that regional update is still in flight.
            const registered = await tx.workspaceUsage.findMany({
              where: {
                regionUid: region.uid,
                workspaceUid: { in: missingWorkspaces.map((w) => w.workspaceUid) }
              },
              select: { workspaceUid: true, userUid: true }
            });
            const previousPrivateOwners = registered.filter(
              (u) => u.workspaceUid === workspaceUid && u.userUid !== userUid
            );
            let recoverMergedPrivate = false;
            if (previousPrivateOwners.length > 0) {
              // 合并可以是 A→B→C；逐级验证来源，不能只接受直接 A→C，
              // 也不能凭目标账号存在任意一条合并记录就接管其他账号的登记。
              for (const previousOwner of previousPrivateOwners) {
                const visited = new Set<string>();
                let ownerUid = previousOwner.userUid;
                while (ownerUid !== userUid && !visited.has(ownerUid)) {
                  visited.add(ownerUid);
                  const mergeInfo = await tx.mergeUserTransactionInfo.findUnique({
                    where: { mergeUserUid: ownerUid },
                    select: { userUid: true }
                  });
                  if (!mergeInfo) break;
                  ownerUid = mergeInfo.userUid;
                }
                if (ownerUid !== userUid) {
                  throw new Error('Private workspace is registered to another user');
                }
              }
              recoverMergedPrivate = true;
            }
            const occupiedWorkspaceUids = new Set(registered.map((u) => u.workspaceUid));
            const unregistered = missingWorkspaces.filter(
              (w) =>
                !occupiedWorkspaceUids.has(w.workspaceUid) ||
                (w.workspaceUid === workspaceUid && recoverMergedPrivate)
            );
            if (unregistered.length > 0) {
              await tx.workspaceUsage.createMany({
                data: unregistered.map(({ workspace }) => ({
                  userUid,
                  regionUid: region.uid,
                  workspaceUid: workspace.uid,
                  seat: workspace.userWorkspace.filter((u) => u.status === JoinStatus.IN_WORKSPACE)
                    .length
                })),
                skipDuplicates: true
              });
            }
          },
          { isolationLevel: 'Serializable' }
        );
      }
    } else {
      // 普通登录不能替尚未开始初始化的新用户创建空间。
      if (userResult.userInfo && !userResult.userInfo.isInited && !initialize) return null;
      const reservation = await globalPrisma.$transaction(
        async (tx) => {
          // 把读取与预留放在同一个串行化事务中，避免并发初始化生成不同 UID。
          const registered = await tx.workspaceUsage.findMany({ where: { userUid } });
          if (
            initialize &&
            !userResult.userInfo?.isInited &&
            registered.some((u) => u.regionUid !== region.uid)
          ) {
            // 无法证明其他区域的登记是失败占位时，保留它并停止本次初始化。
            return null;
          }
          const local = registered.filter((u) => u.regionUid === region.uid);
          if (local.length > 1)
            throw new Error('Ambiguous workspace registrations without a regional user');
          if (local.length === 1)
            return { workspaceUid: local[0].workspaceUid, needCreating: false };
          const workspaceUid = v4();
          await tx.workspaceUsage.create({
            data: { workspaceUid, userUid, regionUid: region.uid, seat: 1 }
          });
          return { workspaceUid, needCreating: true };
        },
        { isolationLevel: 'Serializable' }
      );
      if (!reservation) return null;
      workspaceUid = reservation.workspaceUid;
      needCreating = reservation.needCreating;
    }

    const payload = await prisma.$transaction(async (tx): Promise<AccessTokenPayload | null> => {
      let userCrResult = await tx.userCr.findUnique({
        where: {
          userUid
        },
        include: {
          userWorkspace: {
            include: {
              workspace: true
            }
          }
        }
      });
      if (userCrResult) {
        // get a exist user
        const relations = userCrResult.userWorkspace!;
        const privateRelations = relations.filter(
          (r) => r.isPrivate && r.role === Role.OWNER && r.status === JoinStatus.IN_WORKSPACE
        );
        if (privateRelations.length !== 1) {
          throw new Error('Expected exactly one active private workspace owner relation');
        }
        const privateRelation = privateRelations[0];
        if (privateRelation?.workspaceUid !== workspaceUid) {
          // 区域关系在两次读取间改变时重试，不能改写已有登记来掩盖归属冲突。
          return null;
        }
        return {
          userUid: userCrResult.userUid,
          userCrUid: userCrResult.uid,
          userCrName: userCrResult.crName,
          regionUid: region.uid,
          userId,
          // there is only one private workspace
          workspaceId: privateRelation!.workspace.id,
          workspaceUid: privateRelation!.workspace.uid
        };
      } else {
        const crName = nanoid();
        const regionResult = await tx.userCr.findUnique({
          where: {
            userUid
          }
        });
        if (regionResult) throw Error('the user is already exist');
        const workspaceId = GetUserDefaultNameSpace(crName);
        const result = await tx.userWorkspace.create({
          data: {
            status: JoinStatus.IN_WORKSPACE,
            role: Role.OWNER,
            workspace: {
              create: {
                uid: workspaceUid,
                id: workspaceId,
                displayName: workspaceName
              }
            },
            userCr: {
              create: {
                crName,
                userUid
              }
            },
            joinAt: new Date(),
            isPrivate: true
          },
          include: {
            userCr: {
              select: {
                uid: true,
                crName: true,
                userUid: true
              }
            },
            workspace: {
              select: {
                id: true,
                uid: true
              }
            }
          }
        });
        return {
          userCrName: result.userCr.crName,
          userCrUid: result.userCr.uid,
          userUid: result.userCr.userUid,
          regionUid: region.uid,
          userId,
          // there is only one private workspace
          workspaceId: result.workspace.id,
          workspaceUid: result.workspace.uid
        };
      }
    });
    if (!payload) {
      if (needCreating && workspaceUid)
        // rollout
        await globalPrisma.workspaceUsage.delete({
          where: {
            regionUid_userUid_workspaceUid: {
              workspaceUid,
              userUid,
              regionUid: region.uid
            }
          }
        });
      throw new Error('Failed to get user from db');
    }
    const kubeconfig = await getUserKubeconfig(
      payload.userCrUid,
      payload.userCrName,
      getUserType()
    );
    if (!kubeconfig) {
      throw new Error('Failed to get user from k8s');
    }
    if (userResult.userInfo && !userResult.userInfo.isInited) {
      // 只有真实空间、全局登记和 K8s 凭据都就绪后才完成初始化。
      // updateMany 允许并发成功的另一次请求先完成标记，避免将它误报为失败。
      await globalPrisma.userInfo.updateMany({
        where: { userUid, isInited: false },
        data: { isInited: true }
      });
    }
    return {
      kubeconfig,
      payload
    };
  }, 3);
  if (!result) return null;
  const { kubeconfig, payload } = result;
  return {
    kubeconfig,
    token: generateRegionalToken(payload),
    appToken: generateAppToken(payload)
  };
}

export async function initRegionToken({
  userUid,
  userId,
  regionUid,
  workspaceName
}: {
  userUid: string;
  userId: string;
  regionUid: string;
  workspaceName: string;
}) {
  // 老用户可能被外部系统补建了 false 状态；与普通登录使用同一空间判断，
  // 先恢复已有私有空间，绝不根据 usage 创建时间删除跨区真实登记。
  return getRegionTokenForRegion({ userUid, userId, regionUid, workspaceName, initialize: true });
}

export async function autoInitRegionToken({
  userUid,
  userId
}: {
  userUid: string;
  userId: string;
}): Promise<{
  kubeconfig: string;
  token: string;
  appToken: string;
} | null> {
  const defaultWorkspaceName = 'My Workspace';

  return await initRegionToken({
    userUid,
    userId,
    regionUid: getRegionUid(),
    workspaceName: defaultWorkspaceName
  });
}
