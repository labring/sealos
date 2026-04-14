import { DeleteUserEvent } from '@/types/db/event';
import { RESOURCE_STATUS } from '@/types/response/checkResource';
import {
  buildDeleteUserPendingResult,
  DELETE_USER_EXECUTION_STATUS,
  DELETE_USER_STATUS,
  DeleteUserFinalStatusResponse,
  parseDeleteUserFailureReason
} from '@/types/response/deleteUser';
import { OnceTokenPayload } from '@/types/token';
import { NextApiResponse } from 'next';
import { TransactionStatus, TransactionType, UserStatus } from 'prisma/global/generated/client';
import { v4 } from 'uuid';
import { verifyRegionalJwt } from '../auth';
import { globalPrisma } from '../db/init';
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

const respondPendingDeleteUser = (res: NextApiResponse, txUid: string) =>
  jsonRes(res, {
    message: DELETE_USER_STATUS.RESULT_SUCCESS,
    code: 200,
    data: buildDeleteUserPendingResult(txUid)
  });

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

  return buildDeleteUserPendingResult(deleteId);
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

  const txUid = await enqueueDeleteUserTransaction(userUid);
  return respondPendingDeleteUser(res, txUid);
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
    const txUid = await enqueueDeleteUserTransaction(userUid);
    return respondPendingDeleteUser(res, txUid);
  };
