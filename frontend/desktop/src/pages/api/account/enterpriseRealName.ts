import { jsonRes } from '@/services/backend/response';
import { enableEnterpriseRealNameAuth } from '@/services/enable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAuthenticationToken, verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { z } from 'zod';
import { PAYMENTSTATUS } from '@/types/response/enterpriseRealName';
import { EnterpriseAuthInfo } from '@/types/response/enterpriseRealName';
import { AdditionalInfo } from '@/types/response/enterpriseRealName';
import { AccessTokenPayload } from '@/types/token';

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

type UnionPay3060Config = {
  api: string;
};

interface ApiError {
  detail: any;
  errorId: string;
  message: string;
  timestamp: number;
  code: string;
}

interface EnterpriseAuthResponse {
  subBank: string;
  transAmt: string;
  orderId: string;
  isCharged: boolean;
  legalPersonName: string;
  isTransactionSuccess: boolean;
  key: string;
  enterpriseName: string;
  accountCity: string;
  respCode: string;
  respMsg: string;
  accountProv: string;
  accountBank: string;
  accountNo: string;
}

interface ApiResponse {
  error?: ApiError;
  data?: EnterpriseAuthResponse;
  success: boolean;
}

const schema = z.object({
  key: z.string().min(1),
  accountBank: z.string().min(1),
  accountNo: z.string().min(1),
  keyName: z.string().min(1),
  usrName: z.string().min(1),
  contactInfo: z.string().min(1).regex(/^\d+$/, 'Contact info must contain only numbers')
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEnterpriseRealNameAuth) {
    console.error('enterpriseRealNameAuth: enterprise real name authentication not enabled');
    return jsonRes(res, { code: 503, message: 'Enterprise real name authentication not enabled' });
  }

  const payload = await verifyAccessToken(req.headers);
  if (!payload) return jsonRes(res, { code: 401, message: 'Token is invalid' });

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, payload.userUid);
    case 'POST':
      return handlePost(req, res, payload.userUid, payload);
    case 'PATCH':
      return handlePatch(req, res, payload.userUid);
    default:
      console.error('enterpriseRealNameAuth: Method not allowed');
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, userUid: string) {
  try {
    const realNameAuthProvider: RealNameAuthProvider | null =
      await globalPrisma.realNameAuthProvider.findFirst({
        where: {
          backend: 'UNIONPAY',
          authType: '3060'
        }
      });

    if (!realNameAuthProvider) {
      throw new Error('enterpriseRealNameAuth: Real name authentication provider not found');
    }

    const info = await globalPrisma.enterpriseRealNameInfo.findUnique({
      where: { userUid }
    });

    if (!info || !info.additionalInfo) {
      return jsonRes(res, {
        code: 200,
        data: { remainingAttempts: realNameAuthProvider.maxFailedTimes }
      });
    }

    const additionalInfo = info.additionalInfo as unknown as AdditionalInfo;

    const response: EnterpriseAuthInfo = {
      paymentStatus: additionalInfo.paymentStatus,
      key: additionalInfo.key,
      accountBank: additionalInfo.accountBank,
      accountNo: additionalInfo.accountNo,
      keyName: additionalInfo.keyName,
      usrName: additionalInfo.usrName,
      contactInfo: additionalInfo.contactInfo,
      remainingAttempts: realNameAuthProvider.maxFailedTimes - (additionalInfo.authTimes || 0)
    };

    return jsonRes(res, { code: 200, data: response });
  } catch (error) {
    console.error('Error fetching enterprise auth info:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userUid: string,
  payload: AccessTokenPayload
) {
  try {
    const realNameAuthProvider: RealNameAuthProvider | null =
      await globalPrisma.realNameAuthProvider.findFirst({
        where: {
          backend: 'UNIONPAY',
          authType: '3060'
        }
      });

    if (!realNameAuthProvider) {
      throw new Error('enterpriseRealNameAuth: Real name authentication provider not found');
    }

    const config: UnionPay3060Config = realNameAuthProvider.config as UnionPay3060Config;

    if (!config) {
      throw new Error('enterpriseRealNameAuth: Real name authentication configuration not found');
    }

    const enterpriseRealNameAuthApi = config.api;

    const enterpriseRealName = await globalPrisma.enterpriseRealNameInfo.findUnique({
      where: { userUid }
    });

    if (enterpriseRealName && enterpriseRealName.isVerified) {
      return jsonRes(res, {
        code: 400,
        message: 'Enterprise real name authentication has been completed'
      });
    }

    if (
      enterpriseRealName &&
      enterpriseRealName.additionalInfo &&
      (enterpriseRealName.additionalInfo as unknown as AdditionalInfo).authTimes >=
        realNameAuthProvider.maxFailedTimes
    ) {
      return jsonRes(res, {
        code: 400,
        message: 'Enterprise real name authentication has reached the maximum number of attempts'
      });
    }

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request body',
        data: validationResult.error.issues
      });
    }

    const data = validationResult.data;

    const enterprise = await globalPrisma.enterpriseRealNameInfo.findFirst({
      where: {
        enterpriseName: data.keyName,
        isVerified: true
      }
    });

    if (enterprise) {
      return jsonRes(res, {
        code: 400,
        message: 'Enterprise real name information has been used'
      });
    }

    const globalToken = generateAuthenticationToken({
      userUid: payload.userUid,
      userId: payload.userId,
      regionUid: payload.regionUid
    });

    const response = await fetch(enterpriseRealNameAuthApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${globalToken}`
      },
      cache: 'no-store',
      body: JSON.stringify({
        key: data.key,
        accountBank: data.accountBank,
        accountNo: data.accountNo,
        keyName: data.keyName,
        usrName: data.usrName
      })
    });

    const apiResponse: ApiResponse = await response.json();

    if (!apiResponse.success) {
      return jsonRes(res, {
        code: 400,
        message: apiResponse?.error?.message || 'API request failed'
      });
    }

    if (!apiResponse.data?.isTransactionSuccess || !apiResponse.data?.transAmt) {
      return jsonRes(res, {
        code: 400,
        message: `request failed, code: ${apiResponse.data?.respCode}, message: ${apiResponse.data?.respMsg}`
      });
    }

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    await globalPrisma.enterpriseRealNameInfo.upsert({
      where: { userUid },
      update: {
        enterpriseName: apiResponse.data.enterpriseName,
        isVerified: false,
        additionalInfo: {
          paymentStatus: PAYMENTSTATUS.PROCESSING,
          key: apiResponse.data.key,
          accountBank: apiResponse.data.accountBank,
          accountNo: apiResponse.data.accountNo,
          keyName: apiResponse.data.enterpriseName,
          usrName: apiResponse.data.legalPersonName,
          contactInfo: data.contactInfo,
          transAmt: apiResponse.data.transAmt,
          authTimes: (enterpriseRealName?.additionalInfo as unknown as AdditionalInfo)?.authTimes
            ? (enterpriseRealName?.additionalInfo as unknown as AdditionalInfo).authTimes + 1
            : 1
        }
      },
      create: {
        userUid,
        enterpriseName: apiResponse.data.enterpriseName,
        isVerified: false,
        additionalInfo: {
          paymentStatus: PAYMENTSTATUS.PROCESSING,
          key: apiResponse.data.key,
          accountBank: apiResponse.data.accountBank,
          accountNo: apiResponse.data.accountNo,
          keyName: apiResponse.data.enterpriseName,
          usrName: apiResponse.data.legalPersonName,
          contactInfo: data.contactInfo,
          transAmt: apiResponse.data.transAmt,
          authTimes: 1
        }
      }
    });

    return jsonRes(res, {
      code: 200,
      message: 'Enterprise auth request processed successfully',
      data: {
        paymentStatus: PAYMENTSTATUS.PROCESSING
      }
    });
  } catch (error) {
    console.error('Error processing enterprise auth request:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse, userUid: string) {
  try {
    const info = await globalPrisma.enterpriseRealNameInfo.findUnique({
      where: { userUid }
    });

    if (!info) {
      return jsonRes(res, { code: 404, message: 'Enterprise auth info not found' });
    }

    if (info.isVerified) {
      return jsonRes(res, { code: 400, message: 'Enterprise auth has been completed' });
    }

    await globalPrisma.enterpriseRealNameInfo.update({
      where: { userUid },
      data: {
        additionalInfo: {
          ...(info.additionalInfo as object),
          paymentStatus: PAYMENTSTATUS.CANCEL
        }
      }
    });

    return jsonRes(res, {
      code: 200,
      message: 'Payment status updated successfully',
      data: {
        paymentStatus: PAYMENTSTATUS.CANCEL
      }
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
