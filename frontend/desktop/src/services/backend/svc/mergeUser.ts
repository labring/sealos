import { NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { globalPrisma } from '../db/init';
import { RESOURCE_STATUS, USER_MERGE_STATUS } from '@/types/user';
import { v4 } from 'uuid';
import { TransactionType, TransactionStatus, AuditAction } from 'prisma/global/generated/client';

export const mergeUserSvc =
  (userUid: string, mergeUserUid: string) => async (res: NextApiResponse) => {
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
        message: USER_MERGE_STATUS.USER_NOT_FOUND,
        code: 404
      });
    const txUid = v4();
    const infoUid = v4();
    const regionResults = await globalPrisma.region.findMany();
    if (!regionResults) throw Error('region list is null');
    const regionList = regionResults.map((r) => r.uid);
    const oauthProviderList = await globalPrisma.oauthProvider.findMany({
      where: {
        userUid: mergeUserUid
      }
    });
    // add task ( catch by outer )
    await globalPrisma.$transaction([
      // optimistic
      ...oauthProviderList.flatMap((oauthProvider) => [
        globalPrisma.oauthProvider.findUniqueOrThrow({
          where: {
            uid: oauthProvider.uid,
            userUid: mergeUserUid
          }
        }),
        globalPrisma.oauthProvider.update({
          where: {
            uid: oauthProvider.uid,
            userUid: mergeUserUid
          },
          data: {
            userUid
          }
        }),
        globalPrisma.auditLog.create({
          data: {
            action: AuditAction.UPDATE,
            entityUid: oauthProvider.uid,
            entityName: 'oauthProvider',
            auditLogDetail: {
              create: [
                {
                  key: 'userUid',
                  preValue: mergeUserUid,
                  newValue: userUid
                }
              ]
            }
          }
        })
      ]),
      globalPrisma.precommitTransaction.create({
        data: {
          uid: txUid,
          status: TransactionStatus.READY,
          infoUid,
          transactionType: TransactionType.MERGE_USER
        }
      }),
      globalPrisma.mergeUserTransactionInfo.create({
        data: {
          uid: infoUid,
          mergeUserUid,
          userUid
        }
      }),
      globalPrisma.transactionDetail.createMany({
        data: regionList.map((regionUid) => ({
          status: TransactionStatus.READY,
          transactionUid: txUid,
          regionUid
        }))
      })
    ]);
    return jsonRes(res, {
      message: RESOURCE_STATUS.RESULT_SUCCESS,
      code: 200
    });
  };
