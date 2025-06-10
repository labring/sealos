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
      throw new Error('enterpriseRealNameVerify: Real name authentication provider not found');
    }

    const config: TencentCloudFaceAuthConfig =
      realNameAuthProvider.config as TencentCloudFaceAuthConfig;

    if (!config) {
      throw new Error('enterpriseRealNameVerify: Real name authentication configuration not found');
    }

    let realNameAuthReward = config.realNameAuthReward ?? 0;

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
      where: { userUid: userUid }
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

    // check if the enterprise name has been used
    const enterprise = await globalPrisma.enterpriseRealNameInfo.findFirst({
      where: {
        enterpriseName: additionalInfo.keyName,
        isVerified: true
      }
    });

    if (enterprise && (enterprise?.additionalInfo as unknown as AdditionalInfo)?.isRestrictedUser) {
      return jsonRes(res, {
        code: 400,
        message: "Restricted User Can't Enterprise Real Name Authentication"
      });
    }

    let duplicateRealNameUser = false;

    if (enterprise) {
      duplicateRealNameUser = true;
    }

    await globalPrisma.$transaction(async (globalPrisma) => {
      try {
        await globalPrisma.$queryRawUnsafe(
          'SELECT * FROM "EnterpriseRealNameInfo" WHERE "userUid" = $1 FOR UPDATE NOWAIT',
          userUid
        );
      } catch (lockError) {
        return;
      }

      const enterpriseRealNameInfo = await globalPrisma.enterpriseRealNameInfo.update({
        where: { userUid: userUid },
        data: {
          isVerified: true,
          additionalInfo: {
            ...additionalInfo,
            paymentStatus: PAYMENTSTATUS.SUCCESS
          }
        }
      });

      await globalPrisma.userTask.updateMany({
        where: {
          userUid: userUid,
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

      if (duplicateRealNameUser) {
        return;
      }

      const userAccount = await globalPrisma.account.findUniqueOrThrow({
        where: { userUid: userUid }
      });

      if (!userAccount.balance) {
        throw new Error('enterpriseRealNameVerify: Account balance not found');
      }

      let totalUserReward = BigInt(0);
      const userActivityBonus = userAccount.activityBonus || BigInt(0);
      let currentUserBalance = userAccount.balance;

      if (inviteInfo.inviterId && inviteInfo.amount) {
        const realnameInviteReward = inviteInfo.amount;

        await globalPrisma.accountTransaction.create({
          data: {
            type: 'REALNAME_AUTH_INVITE_REWARD',
            userUid: userUid,
            balance: realnameInviteReward,
            balance_before: currentUserBalance,
            deduction_balance: 0,
            deduction_balance_before: userAccount.deduction_balance,
            message: 'Real name authentication invite reward',
            billing_id: enterpriseRealNameInfo.id
          }
        });

        currentUserBalance += realnameInviteReward;
        totalUserReward += realnameInviteReward;

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

        const inviterActivityBonus = inviterAccount.activityBonus || BigInt(0);

        await globalPrisma.account.update({
          where: { userUid: inviterUser.uid },
          data: {
            activityBonus: inviterActivityBonus + realnameInviteReward,
            balance: inviterAccount.balance + realnameInviteReward,
            updated_at: new Date()
          }
        });

        await globalPrisma.accountTransaction.create({
          data: {
            type: 'REALNAME_AUTH_INVITE_REWARD',
            userUid: inviterUser.uid,
            balance: realnameInviteReward,
            balance_before: inviterAccount.balance,
            deduction_balance: 0,
            deduction_balance_before: inviterAccount.deduction_balance,
            message: 'Real name authentication invite reward',
            billing_id: enterpriseRealNameInfo.id
          }
        });
      }

      if (realNameAuthReward > 0) {
        const realnameReward = BigInt(realNameAuthReward);

        await globalPrisma.accountTransaction.create({
          data: {
            type: 'REALNAME_AUTH_REWARD',
            userUid: userUid,
            balance: realnameReward,
            balance_before: currentUserBalance,
            deduction_balance: 0,
            deduction_balance_before: userAccount.deduction_balance,
            message: 'Real name authentication reward',
            billing_id: enterpriseRealNameInfo.id
          }
        });

        currentUserBalance += realnameReward;
        totalUserReward += realnameReward;
      }

      if (totalUserReward > 0) {
        await globalPrisma.account.update({
          where: { userUid: userUid },
          data: {
            activityBonus: userActivityBonus + totalUserReward,
            balance: currentUserBalance,
            updated_at: new Date()
          }
        });
      }

      return;
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
