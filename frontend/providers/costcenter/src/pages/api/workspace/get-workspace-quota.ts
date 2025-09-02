import type { NextApiRequest, NextApiResponse } from 'next';
import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import {
  UserQuotaItem,
  WorkspaceQuotaRequest,
  WorkspaceQuotaRequestSchema
} from '@/types/workspace';

type QuotaStatus = Record<string, string>;
type UpstreamQuotaResponse = {
  quota?: {
    hard?: QuotaStatus;
    used?: QuotaStatus;
  };
};

const cpuFormatToM = (cpu: string) => {
  if (!cpu || cpu === '0') {
    return 0;
  }
  let value = parseFloat(cpu);

  if (/n/gi.test(cpu)) {
    value = value / 1000 / 1000;
  } else if (/u/gi.test(cpu)) {
    value = value / 1000;
  } else if (/m/gi.test(cpu)) {
    value = value;
  } else {
    value = value * 1000;
  }
  if (value < 0.1) return 0;
  return Number(value.toFixed(4));
};

const memoryFormatToMi = (memory: string) => {
  if (!memory || memory === '0') {
    return 0;
  }

  let value = parseFloat(memory);

  if (/Ki/gi.test(memory)) {
    value = value / 1024;
  } else if (/Mi/gi.test(memory)) {
    value = value;
  } else if (/Gi/gi.test(memory)) {
    value = value * 1024;
  } else if (/Ti/gi.test(memory)) {
    value = value * 1024 * 1024;
  } else {
    value = 0;
  }

  return Number(value.toFixed(2));
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

    const { workspace } = parseResult.data as WorkspaceQuotaRequest;

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

    console.log('response', response.data);
    const hard = response?.data?.quota?.hard || {};
    const used = response?.data?.quota?.used || {};

    const quota: UserQuotaItem[] = [
      {
        type: 'cpu',
        limit: cpuFormatToM(hard['limits.cpu'] || ''),
        used: cpuFormatToM(used['limits.cpu'] || '')
      },
      {
        type: 'memory',
        limit: memoryFormatToMi(hard['limits.memory'] || ''),
        used: memoryFormatToMi(used['limits.memory'] || '')
      },
      {
        type: 'storage',
        limit: memoryFormatToMi(hard['requests.storage'] || ''),
        used: memoryFormatToMi(used['requests.storage'] || '')
      },
      {
        type: 'nodeport',
        limit: Number(hard['services.nodeports']) || 0,
        used: Number(used['services.nodeports']) || 0
      },
      {
        type: 'traffic',
        limit: Number(hard['traffic']) || 0,
        used: Number(used['traffic']) || 0
      },
      {
        type: 'gpu',
        limit: Number(hard['limits.nvidia.com/gpu'] || hard['requests.nvidia.com/gpu'] || 0),
        used: Number(used['limits.nvidia.com/gpu'] || used['requests.nvidia.com/gpu'] || 0)
      }
    ];

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
