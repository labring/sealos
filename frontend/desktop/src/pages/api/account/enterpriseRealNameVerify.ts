import { jsonRes } from '@/services/backend/response';
import { enableEnterpriseRealNameAuth } from '@/services/enable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { z } from 'zod';
import { PAYMENTSTATUS } from '@/types/response/enterpriseRealName';
import { AdditionalInfo } from '@/types/response/enterpriseRealName';

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

  try {
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

    if (additionalInfo.transAmt === transAmt) {
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
    }

    return jsonRes(res, {
      code: 200,
      message: 'transAmt_not_match',
      data: {
        authState: 'failed'
      }
    });
  } catch (error) {
    console.error('Error processing verify request:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
