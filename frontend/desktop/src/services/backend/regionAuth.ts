import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { getRegionUid } from '@/services/enable';
import { GetUserDefaultNameSpace } from '@/services/backend/kubernetes/user';
import { customAlphabet } from 'nanoid';
import { retrySerially } from '@/utils/tools';
import { AccessTokenPayload } from '@/types/token';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { generateAccessToken, generateAppToken } from '@/services/backend/auth';
import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { v4 } from 'uuid';
import { HttpStatusCode } from 'axios';
import { userInfo } from 'node:os';

const LetterBytes = 'abcdefghijklmnopqrstuvwxyz0123456789';
const HostnameLength = 8;

const nanoid = customAlphabet(LetterBytes, HostnameLength);

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
export async function getRegionToken({
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
  const region = await globalPrisma.region.findUnique({
    where: {
      uid: getRegionUid()
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
    let workspaceUid: string | undefined;
    let curRegionWorkspaceUsage = userResult.WorkspaceUsage.filter(
      (u) => u.regionUid == region.uid
    );
    const needFlush = !userResult.userInfo;
    if (needFlush) {
      // flush user workspace
      const result = await prisma.userCr.findUnique({
        where: {
          userUid: userUid
        },
        select: {
          uid: true,
          userWorkspace: {
            select: {
              workspace: {
                select: {
                  uid: true,
                  userWorkspace: true
                }
              },
              role: true,
              status: true,
              isPrivate: true
            }
          }
        }
      });
      const ownerWorkspace =
        result?.userWorkspace.filter(
          ({ status, role }) => status === 'IN_WORKSPACE' && role === 'OWNER'
        ) || [];
      ownerWorkspace.sort((a, b) => {
        if (a.isPrivate && !b.isPrivate) {
          return -1;
        } else if (!a.isPrivate && b.isPrivate) {
          return 1;
        }
        return 0;
      });

      if (curRegionWorkspaceUsage.length === 0 && ownerWorkspace.length > 0)
        await globalPrisma.$transaction(async (tx) => {
          for await (const r of ownerWorkspace) {
            await tx.workspaceUsage.create({
              data: {
                userUid: userUid,
                workspaceUid: r.workspace.uid,
                seat: r.workspace.userWorkspace.filter(
                  (predicate) => predicate.status === 'IN_WORKSPACE'
                ).length,
                regionUid: region.uid
              }
            });
          }
        });
    } else if (userResult.userInfo && !userResult.userInfo.isInited) {
      return null;
    }
    if (needFlush) {
      const afterFlushResult = await globalPrisma.workspaceUsage.findMany({
        where: {
          userUid: userUid
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      curRegionWorkspaceUsage = afterFlushResult.filter((u) => u.regionUid == region.uid);
    }
    let needCreating = curRegionWorkspaceUsage.length === 0;
    // 先处理全局状态
    if (!needCreating) {
      // find out private workspace
      const result = await prisma.userCr.findUnique({
        where: {
          userUid: userUid
        },
        select: {
          userWorkspace: {
            select: {
              role: true,
              status: true,
              isPrivate: true,
              workspaceUid: true
            }
          }
        }
      });
      const privateWorkspace = (result?.userWorkspace || []).find(
        ({ isPrivate, role, workspaceUid, status }) =>
          isPrivate && role === 'OWNER' && status === 'IN_WORKSPACE'
      );
      workspaceUid = privateWorkspace?.workspaceUid;
    } else {
      workspaceUid = v4();
      await globalPrisma.workspaceUsage.create({
        data: {
          workspaceUid,
          userUid,
          regionUid: region.uid,
          seat: 1
        }
      });
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
        const privateRelation = relations.find(
          (r) => r.isPrivate && r.role === 'OWNER' && r.status === 'IN_WORKSPACE'
        );
        if (privateRelation?.workspaceUid !== workspaceUid) {
          // 不匹配的未知错误
          console.error(
            'workspaceUid not match, workspaceUid:',
            workspaceUid,
            'privateRelation.workspaceUid',
            privateRelation?.workspaceUid
          );

          // try to fix the workspace usage record
          try {
            // check if the user is merged
            const mergeUserInfo = await globalPrisma.mergeUserTransactionInfo.findFirst({
              where: {
                userUid: userUid
              }
            });

            if (mergeUserInfo && privateRelation) {
              console.log('Found merge user info, attempting to fix WorkspaceUsage');

              await globalPrisma.workspaceUsage.updateMany({
                where: {
                  userUid: userUid,
                  regionUid: region.uid,
                  workspaceUid: workspaceUid
                },
                data: {
                  workspaceUid: privateRelation.workspaceUid
                }
              });

              return {
                userUid: userCrResult.userUid,
                userCrUid: userCrResult.uid,
                userCrName: userCrResult.crName,
                regionUid: region.uid,
                userId,
                workspaceId: privateRelation.workspace.id,
                workspaceUid: privateRelation.workspace.uid
              };
            }
          } catch (error) {
            console.error('Failed to fix WorkspaceUsage mismatch:', error);
          }

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
                displayName: 'private team'
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
      'Subscription'
    );
    if (!kubeconfig) {
      throw new Error('Failed to get user from k8s');
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
    token: generateAccessToken(payload),
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
}): Promise<{
  kubeconfig: string;
  token: string;
  appToken: string;
} | null> {
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
    // 没有该user
    if (!userResult?.userInfo) {
      console.log(`user  not found userUid:${userUid}`);
      return null;
    }
    // 先更新状态再操作，避免并发问题
    // isInited 是成功的时候， 考虑到 创建 workspce-user 步骤过多，
    // 先把状态同步到WorkspaceUsage,
    // 再执行操作，最后再标记为 isInited
    // 已经初始化，不应该允许调用该接口
    if (!!userResult.userInfo.isInited) {
      console.log(`user  already initialized userUid:${userUid}`);
      return null;
    }
    // initalizing or error
    let isInitalizing = userResult.WorkspaceUsage.length > 0;
    let workspaceUid = v4();
    if (isInitalizing) {
      // 正在初始化中，还未完成/挂掉
      let workspaceUsage = userResult.WorkspaceUsage[0];
      if (workspaceUsage.regionUid !== region.uid) {
        // 其他可用区正在初始化
        console.log('other region is initializing');
        console.log(`user  already initialized userUid:${userUid}`);
        if (workspaceUsage.createdAt.getTime() < new Date().getTime() - 1000 * 60 * 15) {
          // 如果创建时间大于15分钟，则认为初始化失败，重新初始化
          await globalPrisma.workspaceUsage.delete({
            where: {
              id: workspaceUsage.id
            }
          });
          throw new Error(
            `workspaceUsage createdAt is too old, re-initializing, regionUid:${region.uid}, userUid:${userUid}, workspaceUid:${workspaceUsage.workspaceUid}`
          );
        }

        return null;
      } else {
        // 当前可用区初始化中，用幂等逻辑
        workspaceUid = workspaceUsage.workspaceUid;
      }
    } else {
      // 没开始，
      await globalPrisma.workspaceUsage.create({
        data: {
          workspaceUid,
          userUid,
          regionUid: region.uid,
          seat: 1
        }
      });
    }
    // try {
    // db操作 做不到事务，只能用幂等解决
    let firstSignUpWorkspaceId = '';
    const regionalDbResult = await prisma.$transaction(
      async (tx): Promise<AccessTokenPayload | null> => {
        //
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
        // userCrResult 隐含了最新的 isInitalizing 状态，停机导致异常也能包含在内
        if (userCrResult) {
          const relations = userCrResult.userWorkspace!;
          const privateRelation = relations.find(
            (r) => r.isPrivate && r.role === 'OWNER' && r.status === 'IN_WORKSPACE'
          );
          if (privateRelation?.workspaceUid !== workspaceUid) {
            // 和workspaceUsage 记录的不一致, 未知错误
            console.error('workspaceUid not match, workspaceUid:', workspaceUid);
            return null;
          }
          return {
            userUid: userCrResult.userUid,
            userCrUid: userCrResult.uid,
            userCrName: userCrResult.crName,
            regionUid: region.uid,
            userId,
            workspaceId: privateRelation!.workspace.id,
            workspaceUid: privateRelation!.workspace.uid
          };
        } else {
          const crName = nanoid();
          const workspaceId = GetUserDefaultNameSpace(crName);
          firstSignUpWorkspaceId = workspaceId;
          const result = await tx.userWorkspace.create({
            data: {
              status: JoinStatus.IN_WORKSPACE,
              role: Role.OWNER,
              // workspaceUid,
              workspace: {
                create: {
                  // 保证和状态中的那个一样
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
          // await globalPrisma.
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
      }
    );
    if (!regionalDbResult) {
      const failureMessage = 'failed to get user from db';
      throw new Error(failureMessage);
    }
    // k8s 操作会自动创建, 幂等
    const kubeconfig = await getUserKubeconfig(
      regionalDbResult.userCrUid,
      regionalDbResult.userCrName,
      'Subscription'
    );
    if (!kubeconfig) {
      const failureMessage = 'failed to get user from k8s';
      throw new Error(failureMessage);
    }
    console.log('first sign up workspace id: ', firstSignUpWorkspaceId);

    await globalPrisma.userInfo.update({
      where: {
        userUid,
        isInited: false
      },
      data: {
        isInited: true
      }
    });
    return {
      kubeconfig,
      payload: regionalDbResult
    };
  }, 3);
  if (!result) {
    console.log('Failed to init workspace for new user');
    return null;
  }

  const { kubeconfig, payload } = result;
  return {
    kubeconfig,
    token: generateAccessToken(payload),
    appToken: generateAppToken(payload)
  };
}
