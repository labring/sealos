import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClient } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { PlanListResponse, PlanListResponseSchema } from '@/types/plan';
import { ApiResp } from '@/types/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = makeAPIClient(null);

    const response = await client.post<PlanListResponse>(
      '/account/v1alpha1/workspace-subscription/plan-list'
    );

    if (!response?.data) {
      return jsonRes(res, {
        code: 500,
        message: 'Internal server error'
      });
    }

    return jsonRes(res, {
      data: {
        plans: response.data?.plans || []
      }
    });
  } catch (error: any) {
    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
