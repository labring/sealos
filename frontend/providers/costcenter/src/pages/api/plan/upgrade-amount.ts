import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import {
  UpgradeAmountRequestSchema,
  UpgradeAmountResponse,
  UpgradeAmountResponseSchema
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

    const { workspace, regionDomain, planName, period, payMethod, operator, discountCode } =
      parseResult.data;

    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const response = await client.post<UpgradeAmountResponse>(
      '/account/v1alpha1/workspace-subscription/upgrade-amount',
      {
        workspace,
        regionDomain,
        planName,
        period,
        payMethod,
        operator,
        discountCode
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
    console.log({ error: error.response?.data });
    // Handle 404 as invalid discount code
    if (error.response?.status === 404) {
      return jsonRes(res, {
        code: 404,
        message: 'Invalid discount code'
      });
    }
    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
