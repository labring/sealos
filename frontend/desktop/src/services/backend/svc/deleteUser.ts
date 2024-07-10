import { NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { globalPrisma, prisma } from '../db/init';
import { v4 } from 'uuid';
import { TransactionType, TransactionStatus, AuditAction } from 'prisma/global/generated/client';
import { RESOURCE_STATUS } from '@/types/response/checkResource';
import { DeleteUserEvent } from '@/types/db/event';

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
    for await (const oauthProvider of oauthProviderList) {
      await tx.oauthProvider.delete({
        where: {
          uid: oauthProvider.uid
        }
      });
      const eventName = DeleteUserEvent['<DELETE_USER>_DELETE_OAUTH_PROVIDER'];
      const _data = {
        userUid,
        providerType: oauthProvider.providerType,
        providerId: oauthProvider.providerId,
        message: `${oauthProvider.providerType}:${oauthProvider.providerId}, delete`
      };
      await tx.eventLog.create({
        data: {
          eventName,
          mainId: userUid,
          data: JSON.stringify(_data)
        }
      });
    }
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
    message: RESOURCE_STATUS.RESULT_SUCCESS,
    code: 200
  });
};
