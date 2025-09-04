import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  WorkspaceConsumptionRequestSchema,
  WorkspaceConsumptionRequest,
  WorkspaceConsumptionResponse
} from '@/types/billing';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(resp, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = WorkspaceConsumptionRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(resp, {
        code: 400,
        message: 'Invalid request parameters',
        error: parseResult.error.issues
      });
    }

    const { startTime, endTime } = parseResult.data;

    const client = await makeAPIClientByHeader(req, resp);
    if (!client) {
      return jsonRes(resp, {
        code: 500,
        message: 'Internal server error'
      });
    }

    const requestBody = {
      startTime,
      endTime
    };

    const results = await client.post<WorkspaceConsumptionResponse>(
      '/account/v1alpha1/costs/workspace/consumption',
      requestBody
    );

    if (results.status !== 200) {
      console.log('API Error:', results.data);
      throw new Error('get consumption error');
    }

    const data = results.data;
    if (!data) {
      throw new Error('No data received from API');
    }

    return jsonRes(resp, {
      code: 200,
      data
    });
  } catch (error) {
    console.error('Workspace consumption API error:', error);
    return jsonRes(resp, {
      code: 500,
      message: 'get consumption error'
    });
  }
}
