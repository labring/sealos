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

    await globalPrisma.$transaction(async (globalPrisma) => {
      try {
        await globalPrisma.$queryRawUnsafe(
          'SELECT * FROM "EnterpriseRealNameInfo" WHERE "userUid" = $1 FOR UPDATE NOWAIT',
          userUid
        );
      } catch (lockError) {
        return;
      }

      await globalPrisma.enterpriseRealNameInfo.update({
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
