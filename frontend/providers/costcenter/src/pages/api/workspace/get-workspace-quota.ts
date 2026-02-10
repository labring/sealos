import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { UserQuotaItem, WorkspaceQuotaRequestSchema } from '@/types/workspace';
import { Quantity } from '@sealos/shared';

type QuotaStatus = Record<string, string>;
type UpstreamQuotaResponse = {
  quota?: {
    hard?: QuotaStatus;
    used?: QuotaStatus;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const parseResult = WorkspaceQuotaRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid request parameters'
      });
    }

    const { workspace } = parseResult.data;

    const client = await makeAPIClientByHeader(req, res);
    if (!client) {
      return jsonRes(res, {
        code: 500,
        message: 'Internal server error'
      });
    }

    const response = await client.post<UpstreamQuotaResponse>(
      '/account/v1alpha1/workspace/get-resource-quota',
      { workspace }
    );

    const hard = response?.data?.quota?.hard || {};
    const used = response?.data?.quota?.used || {};

    const quota: UserQuotaItem[] = [];

    if (hard['limits.cpu'] !== undefined || used['limits.cpu'] !== undefined) {
      quota.push({
        type: 'cpu',
        limit: Quantity.fromJSON(hard['limits.cpu'] || '0'),
        used: Quantity.fromJSON(used['limits.cpu'] || '0')
      });
    }

    if (hard['limits.memory'] !== undefined || used['limits.memory'] !== undefined) {
      quota.push({
        type: 'memory',
        limit: Quantity.fromJSON(hard['limits.memory'] || '0'),
        used: Quantity.fromJSON(used['limits.memory'] || '0')
      });
    }

    if (hard['requests.storage'] !== undefined || used['requests.storage'] !== undefined) {
      quota.push({
        type: 'storage',
        limit: Quantity.fromJSON(hard['requests.storage'] || '0'),
        used: Quantity.fromJSON(used['requests.storage'] || '0')
      });
    }

    if (hard['services.nodeports'] !== undefined || used['services.nodeports'] !== undefined) {
      quota.push({
        type: 'nodeport',
        limit: Quantity.fromJSON(hard['services.nodeports'] || '0'),
        used: Quantity.fromJSON(used['services.nodeports'] || '0')
      });
    }

    if (hard['traffic'] !== undefined || used['traffic'] !== undefined) {
      quota.push({
        type: 'traffic',
        limit: Quantity.fromJSON(hard['traffic'] || '0'),
        used: Quantity.fromJSON(used['traffic'] || '0')
      });
    }

    const gpuHardValue = hard['limits.nvidia.com/gpu'] || hard['requests.nvidia.com/gpu'];
    const gpuUsedValue = used['limits.nvidia.com/gpu'] || used['requests.nvidia.com/gpu'];
    if (gpuHardValue !== undefined || gpuUsedValue !== undefined) {
      quota.push({
        type: 'gpu',
        limit: Quantity.fromJSON(gpuHardValue || '0'),
        used: Quantity.fromJSON(gpuUsedValue || '0')
      });
    }

    return jsonRes(res, {
      data: { quota }
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
