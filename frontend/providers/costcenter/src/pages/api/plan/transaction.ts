import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { WorkspaceSubscriptionRequestSchema, LastTransactionResponse } from '@/types/plan';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = WorkspaceSubscriptionRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters',
        error: parseResult.error.flatten()
      });
    }

    const { workspace, regionDomain } = parseResult.data;

    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;

    const response = await client.post<LastTransactionResponse>(
      '/account/v1alpha1/workspace-subscription/last-transaction',
      {
        workspace,
        regionDomain
      }
    );

    // console.log('response', response.data);

    return jsonRes<LastTransactionResponse>(res, {
      data: response.data
    });
  } catch (error: any) {
    console.error('Error in workspace subscription last-transaction API:', error);

    return jsonRes(res, {
      code: 500,
      message: 'Internal server error'
    });
  }
}
