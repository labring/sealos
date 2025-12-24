import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { verifyInternalToken } from '@/service/auth';
import {
  UpgradeAmountRequestSchema,
  UpgradeAmountResponse,
  UpgradeAmountResponseSchema,
  PendingUpgradeSchema
} from '@/types/plan';
import { ApiResp } from '@/types/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = UpgradeAmountRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters',
        error: parseResult.error.flatten()
      });
    }

    const { workspace, regionDomain, planName, period, payMethod, operator, promotionCode } =
      parseResult.data;

    // Get userUID from token
    const token = req.body.internalToken;
    const payload = await verifyInternalToken(token);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: 'Authorization failed'
      });
    }

    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const response = await client.post<UpgradeAmountResponse>(
      '/account/v1alpha1/workspace-subscription/upgrade-amount',
      {
        userUID: payload.userUid,
        workspace,
        regionDomain,
        planName,
        period,
        payMethod,
        operator,
        promotionCode
      }
    );

    const responseParseResult = UpgradeAmountResponseSchema.safeParse(response.data);
    if (!responseParseResult.success) {
      return jsonRes(res, {
        code: 500,
        message: 'Invalid response format from backend',
        error: responseParseResult.error.flatten()
      });
    }

    return jsonRes<UpgradeAmountResponse>(res, {
      data: responseParseResult.data
    });
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;

    // Handle different error status codes
    if (status === 404) {
      return jsonRes(res, {
        code: 404,
        message: 'Promotion code not found'
      });
    }
    if (status === 410) {
      return jsonRes(res, {
        code: 410,
        message: 'Promotion code expired or disabled'
      });
    }
    if (status === 409) {
      // Check if this is a pending upgrade conflict (has pending_upgrade field)
      // The pending_upgrade might be at the top level or nested
      const pendingUpgradeData = errorData?.pending_upgrade || errorData?.data?.pending_upgrade;

      if (pendingUpgradeData) {
        // Validate pending_upgrade structure
        const pendingUpgradeParseResult = PendingUpgradeSchema.safeParse(pendingUpgradeData);

        if (pendingUpgradeParseResult.success) {
          // Return 409 error using jsonRes with pending_upgrade in data field
          return jsonRes(res, {
            code: 409,
            message: errorData?.error || errorData?.message || 'Previous payment not completed',
            data: {
              pending_upgrade: pendingUpgradeParseResult.data
            }
          });
        }
      }

      // Fallback to promotion code exhausted for other 409 errors
      return jsonRes(res, {
        code: 409,
        message: errorData?.error || errorData?.message || 'Promotion code exhausted'
      });
    }

    return jsonRes(res, {
      code: 500,
      message: errorData?.error || 'Internal server error'
    });
  }
}
