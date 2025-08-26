import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { WorkspaceSubscriptionListResponse } from '@/types/plan';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const response = await client.post<WorkspaceSubscriptionListResponse>(
      '/account/v1alpha1/workspace-subscription/list'
    );

    return jsonRes<WorkspaceSubscriptionListResponse>(res, {
      data: response.data
    });
  } catch (error: any) {
    console.error('Error in workspace subscription list API:', error);

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
