import { jsonRes } from '@/services/backend/response';
import { enableEnterpriseRealNameAuth } from '@/services/enable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { z } from 'zod';
import { PAYMENTSTATUS } from '@/types/response/enterpriseRealName';
import { AdditionalInfo } from '@/types/response/enterpriseRealName';
import { RealNameAuthProvider } from '@/pages/api/account/faceIdRealNameAuthCallback';
import { TencentCloudFaceAuthConfig } from '@/pages/api/account/faceIdRealNameAuthCallback';
import { getInviterInfo } from '@/utils/getInviteInfo';

const schema = z.object({
  transAmt: z.string().min(1)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEnterpriseRealNameAuth) {
    console.error('enterpriseRealNameVerify: enterprise real name authentication not enabled');
    return jsonRes(res, { code: 503, message: 'Enterprise real name authentication not enabled' });
  }

  if (req.method !== 'POST') {
    console.error('enterpriseRealNameVerify: Method not allowed');
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  const payload = await verifyAccessToken(req.headers);
  if (!payload) return jsonRes(res, { code: 401, message: 'Token is invalid' });

  const userUid = payload.userUid;
  const userId = payload.userId;

  const inviteInfo = await getInviterInfo(userId);

  try {
    const realNameAuthProvider: RealNameAuthProvider | null =
      await globalPrisma.realNameAuthProvider.findFirst({
        where: {
          backend: 'TENCENTCLOUD',
          authType: 'tcloudFaceAuth'
        }
      });

    if (!realNameAuthProvider) {
      throw new Error('faceidRealNameAuth: Real name authentication provider not found');
    }

    const config: TencentCloudFaceAuthConfig =
      realNameAuthProvider.config as TencentCloudFaceAuthConfig;

    if (!config) {
      throw new Error('faceidRealNameAuth: Real name authentication configuration not found');
    }

    const realNameAuthReward = config.realNameAuthReward;

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request body',
        data: validationResult.error.issues
      });
    }

    const { transAmt } = validationResult.data;

    const info = await globalPrisma.enterpriseRealNameInfo.findUnique({
      where: { userUid: payload.userUid }
    });

    if (!info || !info.additionalInfo) {
      return jsonRes(res, {
        code: 404,
        data: {
          authState: 'failed'
        },
        message: 'Enterprise auth info not found'
      });
    }

    if (info.isVerified) {
      return jsonRes(res, {
        code: 400,
        message: 'Enterprise real name authentication already verified'
      });
    }

    const additionalInfo = info.additionalInfo as unknown as AdditionalInfo;

    if (additionalInfo.transAmt !== transAmt) {
      return jsonRes(res, {
        code: 200,
        message: 'transAmt_not_match',
        data: {
          authState: 'failed'
        }
      });
    }

    if (realNameAuthReward) {
      await globalPrisma.$transaction(async (globalPrisma) => {
        const currentAccount = await globalPrisma.account.findUniqueOrThrow({
          where: { userUid }
        });

        if (!currentAccount.balance) {
          throw new Error('enterpriseRealNameVerify: Account balance not found');
        }

        const currentActivityBonus = currentAccount.activityBonus || BigInt(0);
        const realnameReward = BigInt(realNameAuthReward);

        const newActivityBonus = currentActivityBonus + realnameReward;
        const newBalance = currentAccount.balance + realnameReward;

        const updatedAccount = await globalPrisma.account.update({
          where: { userUid },
          data: {
            activityBonus: newActivityBonus,
            balance: newBalance
          }
        });

        const enterpriseRealNameInfo = await globalPrisma.enterpriseRealNameInfo.update({
          where: { userUid: payload.userUid },
          data: {
            isVerified: true,
            additionalInfo: {
              ...additionalInfo,
              paymentStatus: PAYMENTSTATUS.SUCCESS
            }
          }
        });

        const accountTransaction = await globalPrisma.accountTransaction.create({
          data: {
            type: 'REALNAME_AUTH_REWARD',
            userUid: userUid,
            balance: realnameReward,
            balance_before: currentAccount.balance,
            deduction_balance: 0, // No deduction in this case
            deduction_balance_before: currentAccount.deduction_balance,
            message: 'Real name authentication reward',
            billing_id: enterpriseRealNameInfo.id // You'll need to implement this function
          }
        });

        await globalPrisma.userTask.updateMany({
          where: {
            userUid,
            task: {
              taskType: 'REAL_NAME_AUTH'
            },
            status: 'NOT_COMPLETED'
          },
          data: {
            rewardStatus: 'COMPLETED',
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });

        if (inviteInfo.inviterId && inviteInfo.amount) {
          const inviterUser = await globalPrisma.user.findUniqueOrThrow({
            where: { id: inviteInfo.inviterId }
          });

          if (!inviterUser) {
            throw new Error('enterpriseRealNameVerify: Inviter user not found');
          }

          const inviterAccount = await globalPrisma.account.findUniqueOrThrow({
            where: { userUid: inviterUser.uid }
          });

          if (!inviterAccount.balance) {
            throw new Error('enterpriseRealNameVerify: Inviter account balance not found');
          }

          const currentActivityBonus = inviterAccount.activityBonus || BigInt(0);
          const realnameInviteReward = inviteInfo.amount;

          const newActivityBonus = currentActivityBonus + realnameInviteReward;
          const newBalance = inviterAccount.balance + realnameInviteReward;

          await globalPrisma.account.update({
            where: { userUid: inviterUser.uid },
            data: {
              activityBonus: newActivityBonus,
              balance: newBalance
            }
          });

          await globalPrisma.accountTransaction.create({
            data: {
              type: 'REALNAME_AUTH_INVITE_REWARD',
              userUid: inviterUser.uid,
              balance: realnameInviteReward,
              balance_before: inviterAccount.balance,
              deduction_balance: 0, // No deduction in this case
              deduction_balance_before: inviterAccount.deduction_balance,
              message: 'Real name authentication invite reward',
              billing_id: enterpriseRealNameInfo.id // You'll need to implement this function
            }
          });
        }

        return {
          account: updatedAccount,
          transaction: accountTransaction,
          enterpriseRealNameInfo: enterpriseRealNameInfo
        };
      });

      return jsonRes(res, {
        code: 200,
        data: {
          authState: 'success',
          enterpriseRealName: additionalInfo.keyName
        }
      });
    }

    await globalPrisma.enterpriseRealNameInfo.update({
      where: { userUid: payload.userUid },
      data: {
        isVerified: true,
        additionalInfo: {
          ...additionalInfo,
          paymentStatus: PAYMENTSTATUS.SUCCESS
        }
      }
    });

    return jsonRes(res, {
      code: 200,
      data: {
        authState: 'success',
        enterpriseRealName: additionalInfo.keyName
      }
    });
  } catch (error) {
    console.error('Error processing verify request:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
