import { DeleteUserEvent } from '@/types/db/event';
import { RESOURCE_STATUS } from '@/types/response/checkResource';
import { DELETE_USER_STATUS } from '@/types/response/deleteUser';
import { OnceTokenPayload } from '@/types/token';
import { NextApiResponse } from 'next';
import { TransactionStatus, TransactionType, UserStatus } from 'prisma/global/generated/client';
import { v4 } from 'uuid';
import { verifyJWT } from '../auth';
import { globalPrisma } from '../db/init';
import { jsonRes } from '../response';

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
  const txUid = v4();
  const infoUid = v4();
  const regionResults = await globalPrisma.region.findMany();
  if (!regionResults) throw Error('region list is null');
  const regionList = regionResults.map((r) => r.uid);
  // add task ( catch by outer )
  await globalPrisma.$transaction(async (tx) => {
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
  });
  return jsonRes(res, {
    message: DELETE_USER_STATUS.RESULT_SUCCESS,
    code: 200
  });
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
    const deleteUserCode = await verifyJWT<OnceTokenPayload>(code);
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
    const txUid = v4();
    const infoUid = v4();
    const regionResults = await globalPrisma.region.findMany();
    if (!regionResults) throw Error('region list is null');
    const regionList = regionResults.map((r) => r.uid);
    // add task ( catch by outer )
    await globalPrisma.$transaction(async (tx) => {
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
    });
    return jsonRes(res, {
      message: DELETE_USER_STATUS.RESULT_SUCCESS,
      code: 200
    });
  };
