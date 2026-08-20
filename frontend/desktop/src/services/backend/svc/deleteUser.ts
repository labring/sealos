import { DeleteUserEvent } from '@/types/db/event';
import { RESOURCE_STATUS } from '@/types/response/checkResource';
import {
  buildDeleteUserFailedResult,
  buildDeleteUserPendingResult,
  buildDeleteUserSuccessResult,
  DELETE_USER_EXECUTION_STATUS,
  DELETE_USER_STATUS,
  DeleteUserFailedWorkspace,
  DeleteUserFinalStatusResponse,
  parseDeleteUserFailureReason
} from '@/types/response/deleteUser';
import { OnceTokenPayload } from '@/types/token';
import { NextApiResponse } from 'next';
import { TransactionStatus, TransactionType, UserStatus } from 'prisma/global/generated/client';
import { Role } from 'prisma/region/generated/client';
import { v4 } from 'uuid';
import { cancelWorkspaceSubscription } from '../billing/workspaceSubscription';
import { verifyRegionalJwt } from '../auth';
import { globalPrisma, prisma } from '../db/init';
import { jsonRes } from '../response';

const ACTIVE_DELETE_TRANSACTION_STATUSES = [
  TransactionStatus.READY,
  TransactionStatus.RUNNING,
  TransactionStatus.FINISH
] as const;

const isUniqueConstraintError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'P2002';

const getActiveDeleteTransactionId = async (userUid: string) => {
  const info = await globalPrisma.deleteUserTransactionInfo.findUnique({
    where: {
      userUid
    }
  });
  if (!info) return null;

  const transaction = await globalPrisma.precommitTransaction.findFirst({
    where: {
      infoUid: info.uid,
      transactionType: TransactionType.DELETE_USER,
      status: {
        in: [...ACTIVE_DELETE_TRANSACTION_STATUSES]
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return transaction?.uid ?? null;
};

const resolveConcurrentDeleteTransaction = async (userUid: string, attempts = 3) => {
  for (let index = 0; index < attempts; index += 1) {
    const activeDeleteId = await getActiveDeleteTransactionId(userUid);
    if (activeDeleteId) return activeDeleteId;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return null;
};

const enqueueDeleteUserTransaction = async (userUid: string): Promise<string> => {
  const txUid = v4();
  const infoUid = v4();
  const regionResults = await globalPrisma.region.findMany();
  if (!regionResults) throw Error('region list is null');
  const regionList = regionResults.map((r) => r.uid);

  try {
    return await globalPrisma.$transaction(async (tx) => {
      const existingInfo = await tx.deleteUserTransactionInfo.findUnique({
        where: {
          userUid
        }
      });

      if (existingInfo) {
        const activeTransaction = await tx.precommitTransaction.findFirst({
          where: {
            infoUid: existingInfo.uid,
            transactionType: TransactionType.DELETE_USER,
            status: {
              in: [...ACTIVE_DELETE_TRANSACTION_STATUSES]
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        });

        if (activeTransaction) {
          return activeTransaction.uid;
        }

        await tx.deleteUserTransactionInfo.delete({
          where: {
            userUid
          }
        });
      }

      await tx.user.update({
        where: {
          uid: userUid
        },
        data: {
          status: UserStatus.LOCK_USER
        }
      });
      const eventName = DeleteUserEvent['<DELETE_USER>_SET_LOCK_USER'];
      const _data = {
        userUid,
        message: 'Set lock user'
      };

      await tx.eventLog.create({
        data: {
          eventName,
          mainId: userUid,
          data: JSON.stringify(_data)
        }
      });
      await tx.eventLog.create({
        data: {
          eventName: DeleteUserEvent['<DELETE_USER>_PUB_TRANSACTION'],
          mainId: userUid,
          data: JSON.stringify({
            message: `${userUid} publish delete user transaction`
          })
        }
      });
      await tx.precommitTransaction.create({
        data: {
          uid: txUid,
          status: TransactionStatus.READY,
          infoUid,
          transactionType: TransactionType.DELETE_USER
        }
      });
      await tx.deleteUserTransactionInfo.create({
        data: {
          uid: infoUid,
          userUid
        }
      });
      await tx.transactionDetail.createMany({
        data: regionList.map((regionUid) => ({
          status: TransactionStatus.READY,
          transactionUid: txUid,
          regionUid
        }))
      });
      return txUid;
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const concurrentTxId = await resolveConcurrentDeleteTransaction(userUid);
    if (concurrentTxId) return concurrentTxId;

    throw error;
  }
};

const respondDeleteUser = (res: NextApiResponse, result: DeleteUserFinalStatusResponse) =>
  jsonRes(res, {
    message: DELETE_USER_STATUS.RESULT_SUCCESS,
    code: 200,
    data: result
  });

const getOwnerWorkspaces = async (userUid: string) => {
  const userCr = await prisma.userCr.findUnique({
    where: { userUid },
    include: {
      userWorkspace: {
        include: {
          workspace: true
        }
      }
    }
  });

  if (!userCr) return [];

  return userCr.userWorkspace
    .filter((item) => item.role === Role.OWNER)
    .map((item) => item.workspace);
};

const cancelOwnerWorkspaceSubscriptionsBeforeDelete = async (props: {
  userUid: string;
  userId: string;
}): Promise<DeleteUserFailedWorkspace[]> => {
  const ownerWorkspaces = await getOwnerWorkspaces(props.userUid);

  const settledResults = await Promise.allSettled(
    ownerWorkspaces.map(async (workspace) => {
      await cancelWorkspaceSubscription({
        userUid: props.userUid,
        userId: props.userId,
        workspaceId: workspace.id
      });
      return workspace;
    })
  );

  return settledResults.reduce<DeleteUserFailedWorkspace[]>((acc, result, index) => {
    if (result.status === 'fulfilled') return acc;

    const workspace = ownerWorkspaces[index];
    const message =
      result.reason instanceof Error && result.reason.message
        ? result.reason.message
        : 'delete workspace subscription error calling billing service';

    acc.push({
      workspaceUid: workspace.uid,
      workspaceName: workspace.displayName,
      action: 'subscription-cancel',
      message
    });
    return acc;
  }, []);
};

export const getDeleteUserStatusByTxUid = async (
  userUid: string,
  deleteId: string
): Promise<DeleteUserFinalStatusResponse | null> => {
  const transaction = await globalPrisma.precommitTransaction.findUnique({
    where: {
      uid: deleteId
    },
    include: {
      errorPreCommitTransaction: true
    }
  });

  if (!transaction || transaction.transactionType !== TransactionType.DELETE_USER) {
    return null;
  }

  const info = await globalPrisma.deleteUserTransactionInfo.findUnique({
    where: {
      uid: transaction.infoUid
    }
  });

  if (!info || info.userUid !== userUid) {
    return null;
  }

  if (transaction.status === TransactionStatus.COMMITED) {
    return {
      deleteId,
      status: DELETE_USER_EXECUTION_STATUS.SUCCESS
    };
  }

  if (transaction.status === TransactionStatus.ERROR) {
    const failureReason = parseDeleteUserFailureReason(
      transaction.errorPreCommitTransaction?.reason
    );
    return {
      deleteId,
      status: DELETE_USER_EXECUTION_STATUS.FAILED,
      failedWorkspaces: failureReason?.failedWorkspaces
    };
  }

  return buildDeleteUserSuccessResult(deleteId);
};

export const deleteUserSvc = (userUid: string) => async (res: NextApiResponse) => {
  const user = await globalPrisma.user.findUnique({
    where: {
      uid: userUid
    },
    include: {
      oauthProvider: true
    }
  });
  if (!user)
    return jsonRes(res, {
      message: RESOURCE_STATUS.USER_NOT_FOUND,
      code: 404
    });
  const oauthProviderList = user.oauthProvider;
  if (oauthProviderList.length === 0)
    return jsonRes(res, {
      message: RESOURCE_STATUS.OAUTHPROVIDER_NOT_FOUND,
      code: 404
    });

  const failedWorkspaces = await cancelOwnerWorkspaceSubscriptionsBeforeDelete({
    userUid,
    userId: user.id
  });
  if (failedWorkspaces.length > 0) {
    console.error('[deleteUser] subscription-cancel:failed-before-enqueue', {
      userUid,
      failedWorkspaces
    });
    return respondDeleteUser(res, buildDeleteUserFailedResult(failedWorkspaces));
  }

  const txUid = await enqueueDeleteUserTransaction(userUid);
  return respondDeleteUser(res, buildDeleteUserSuccessResult(txUid));
};
export const forceDeleteUserSvc =
  (userUid: string, code: string) => async (res: NextApiResponse) => {
    const user = await globalPrisma.user.findUnique({
      where: {
        uid: userUid
      },
      include: {
        oauthProvider: true
      }
    });
    if (!user)
      return jsonRes(res, {
        message: RESOURCE_STATUS.USER_NOT_FOUND,
        code: 404
      });
    const deleteUserCode = await verifyRegionalJwt<OnceTokenPayload>(code);
    if (
      !deleteUserCode ||
      deleteUserCode.type !== 'deleteUser' ||
      deleteUserCode.userUid !== userUid
    ) {
      return jsonRes(res, {
        message: DELETE_USER_STATUS.CODE_ERROR,
        code: 403
      });
    }
    const oauthProviderList = user.oauthProvider;
    if (oauthProviderList.length === 0)
      return jsonRes(res, {
        message: RESOURCE_STATUS.OAUTHPROVIDER_NOT_FOUND,
        code: 404
      });

    const failedWorkspaces = await cancelOwnerWorkspaceSubscriptionsBeforeDelete({
      userUid,
      userId: user.id
    });
    if (failedWorkspaces.length > 0) {
      console.error('[deleteUser] force subscription-cancel:failed-before-enqueue', {
        userUid,
        failedWorkspaces
      });
      return respondDeleteUser(res, buildDeleteUserFailedResult(failedWorkspaces));
    }

    const txUid = await enqueueDeleteUserTransaction(userUid);
    return respondDeleteUser(res, buildDeleteUserSuccessResult(txUid));
  };
