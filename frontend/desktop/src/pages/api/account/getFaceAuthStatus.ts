import { jsonRes } from '@/services/backend/response';
import { enableRealNameAuth } from '@/services/enable';
import type { NextApiRequest, NextApiResponse } from 'next';
import * as tcsdk from 'tencentcloud-sdk-nodejs';
import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { z } from 'zod';
import { GetDetectInfoEnhancedResponse } from 'tencentcloud-sdk-nodejs/tencentcloud/services/faceid/v20180301/faceid_models';

type TencentCloudFaceAuthConfig = {
  secretId: string;
  secretKey: string;
  ruleId: string;
};

type JsonValue = string | number | boolean | object | null;

type RealNameAuthProvider = {
  id: string;
  backend: string;
  authType: string;
  maxFailedTimes: number;
  config: JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

enum FaceAuthStatus {
  SUCCESS = 'Success',
  FAIL = 'Failed',
  PENDING = 'Pending'
}

type FaceAuthResult = {
  status: FaceAuthStatus;
  realName?: string;
};

const bodySchema = z.object({
  bizToken: z.string().length(36, { message: 'bizToken must be exactly 36 characters long' })
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableRealNameAuth) {
    console.error('faceidRealNameAuth: Real name authentication not enabled');
    return jsonRes(res, { code: 503, message: 'Real name authentication not enabled' });
  }

  if (req.method !== 'POST') {
    console.error('realNameAuth: Method not allowed');
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  const payload = await verifyAccessToken(req.headers);
  if (!payload) return jsonRes(res, { code: 401, message: 'Token is invaild' });

  const faceAuthResult: FaceAuthResult = {
    status: FaceAuthStatus.PENDING
  };

  try {
    const { bizToken } = bodySchema.parse(req.body);

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

    const faceAuthInfo = await getUserRealNameInfo(bizToken, config);

    const realNameInfo = await globalPrisma.userRealNameInfo.findUnique({
      where: {
        userUid: payload.userUid
      }
    });

    if (faceAuthInfo.Text?.ErrCode !== null && faceAuthInfo.Text?.ErrCode === 0) {
      if (realNameInfo && realNameInfo.realName && realNameInfo.isVerified) {
        faceAuthResult.status = FaceAuthStatus.SUCCESS;
        faceAuthResult.realName = realNameInfo.realName;
      }
    }

    if (faceAuthInfo.Text?.ErrCode !== null && faceAuthInfo.Text?.ErrCode !== 0) {
      faceAuthResult.status = FaceAuthStatus.FAIL;
    }

    return jsonRes(res, {
      code: 200,
      message: 'success get face auth result',
      data: { status: faceAuthResult.status, realName: faceAuthResult.realName }
    });
  } catch (error) {
    console.error('faceidRealNameAuth: Internal error');
    console.error(error);
    return jsonRes(res, { code: 500, data: 'The server has encountered an error' });
  }
}

async function getUserRealNameInfo(
  bizToken: string,
  config: TencentCloudFaceAuthConfig
): Promise<GetDetectInfoEnhancedResponse> {
  const FaceClient = tcsdk.faceid.v20180301.Client;
  const client = new FaceClient({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey
    },
    region: '',
    profile: {
      signMethod: 'HmacSHA256',
      httpProfile: {
        endpoint: 'faceid.tencentcloudapi.com',
        reqMethod: 'POST',
        reqTimeout: 30 // Request timeout, default 60s
      }
    }
  });

  const params = {
    BizToken: bizToken,
    InfoType: '0',
    RuleId: config.ruleId,
    BestFramesCount: 0
  };

  const data = await client.GetDetectInfoEnhanced(params);
  return data;
}
