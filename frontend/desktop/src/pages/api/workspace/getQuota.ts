import { generateBillingToken, verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { WorkspaceQuotaItem } from '@/types/workspace';
import type { NextApiRequest, NextApiResponse } from 'next';
import { cpuFormatToM, memoryFormatToMi, storageFormatToMi } from '@sealos/shared';

type QuotaStatus = Record<string, string>;
type UpstreamQuotaResponse = {
  quota?: {
    hard?: QuotaStatus;
    used?: QuotaStatus;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
    }

    const session = await verifyAccessToken(req.headers);
    if (!session) {
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    }

    const billingUrl = global.AppConfig.desktop.auth.billingUrl;
    if (!billingUrl) {
      return jsonRes(res, { code: 500, message: 'Billing service not configured' });
    }

    const billingToken = generateBillingToken({
      userUid: session.userUid,
      userId: session.userId
    });

    const quotaRes = await fetch(`${billingUrl}/account/v1alpha1/workspace/get-resource-quota`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${billingToken}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip,deflate,compress'
      },
      body: JSON.stringify({
        workspace: session.workspaceId
      })
    });

    const data: UpstreamQuotaResponse = await quotaRes.clone().json();

    const hard = data.quota?.hard || {};
    const used = data.quota?.used || {};

    const quota: WorkspaceQuotaItem[] = [];

    if (hard['limits.cpu'] !== undefined || used['limits.cpu'] !== undefined) {
      quota.push({
        type: 'cpu',
        limit: cpuFormatToM(hard['limits.cpu'] || ''),
        used: cpuFormatToM(used['limits.cpu'] || '')
      });
    }

    if (hard['limits.memory'] !== undefined || used['limits.memory'] !== undefined) {
      quota.push({
        type: 'memory',
        limit: memoryFormatToMi(hard['limits.memory'] || ''),
        used: memoryFormatToMi(used['limits.memory'] || '')
      });
    }

    if (hard['requests.storage'] !== undefined || used['requests.storage'] !== undefined) {
      quota.push({
        type: 'storage',
        limit: storageFormatToMi(hard['requests.storage'] || ''),
        used: storageFormatToMi(used['requests.storage'] || '')
      });
    }

    if (hard['services.nodeports'] !== undefined || used['services.nodeports'] !== undefined) {
      quota.push({
        type: 'nodeport',
        limit: Number(hard['services.nodeports']) || 0,
        used: Number(used['services.nodeports']) || 0
      });
    }

    if (hard['traffic'] !== undefined || used['traffic'] !== undefined) {
      quota.push({
        type: 'traffic',
        limit: Number(hard['traffic']) || 0,
        used: Number(used['traffic']) || 0
      });
    }

    const gpuHardValue = hard['limits.nvidia.com/gpu'] || hard['requests.nvidia.com/gpu'];
    const gpuUsedValue = used['limits.nvidia.com/gpu'] || used['requests.nvidia.com/gpu'];
    if (gpuHardValue !== undefined || gpuUsedValue !== undefined) {
      quota.push({
        type: 'gpu',
        limit: Number(gpuHardValue) || 0,
        used: Number(gpuUsedValue) || 0
      });
    }

    jsonRes<{
      quota: WorkspaceQuotaItem[];
    }>(res, {
      data: {
        quota
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get namespace quota error' });
  }
}
