import { jsonRes } from '../response';
import { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma } from '../db/init';
import { RESOURCE_STATUS } from '@/types/response/checkResource';

export const accountBalanceGuard =
  (userUid: string) => async (res: NextApiResponse, next?: () => void) => {
    const account = await globalPrisma.account.findUnique({
      where: {
        userUid
      }
    });
    if (!account)
      return jsonRes(res, {
        code: 404,
        message: RESOURCE_STATUS.ACCOUNT_NOT_FOUND
      });
    const balance = Number(account.balance || 0) - Number(account.deduction_balance || 0);
    if (balance < 0)
      return jsonRes(res, {
        code: 409,
        message: RESOURCE_STATUS.INSUFFICENT_BALANCE
      });
    await Promise.resolve(next?.());
  };
