import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { WorkspaceSubscriptionCardInfoRequestSchema, CardInfoResponse } from '@/types/plan';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = WorkspaceSubscriptionCardInfoRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: parseResult.error.message
      });
    }

    const { workspace, regionDomain } = parseResult.data;

    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const response = await client.post<CardInfoResponse>(
      '/account/v1alpha1/workspace-subscription/card-info',
      {
        workspace,
        regionDomain
      }
    );

    return jsonRes<CardInfoResponse>(res, {
      data: response.data
    });
  } catch (error: any) {
    if (error.response?.data) {
      return jsonRes(res, {
        code: error.response.status || 500,
        message: error.response.data.message || 'Backend service error',
        error: error.response.data
      });
    }

    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
