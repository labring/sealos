import { authAppToken, verifyJwt } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { cpuFormatToM, memoryFormatToMi } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

// [TODO] This is the only API that needs to be authenticated, so we put all the authentication logic here.
type QuotaStatus = Record<string, string>;
type UpstreamQuotaResponse = {
  quota?: {
    hard?: QuotaStatus;
    used?: QuotaStatus;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const desktopToken = await authAppToken(req.headers);
    if (!desktopToken) {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    const billingApiJwtSecret = global.AppConfig.launchpad.components.billing.secret;
    const gpuEnabled = global.AppConfig.common.gpuEnabled;
    const billingApiRoot = global.AppConfig.launchpad.components.billing.url;

    const session = await verifyJwt<{
      userId: string;
      userUid: string;
      workspaceId: string;
    }>(desktopToken, billingApiJwtSecret).catch(() => null);
    if (!session) {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    const quotaRes = await fetch(
      `${billingApiRoot}/account/v1alpha1/workspace/get-resource-quota`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${desktopToken}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip,deflate,compress'
        },
        body: JSON.stringify({
          workspace: session.workspaceId
        })
      }
    );

    const data: UpstreamQuotaResponse = await quotaRes.clone().json();

    const hard = data.quota?.hard || {};
    const used = data.quota?.used || {};

    const quota: WorkspaceQuotaItem[] = [
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

    const filteredQuota = gpuEnabled ? quota : quota.filter((item) => item.type !== 'gpu');

    jsonRes<{
      quota: WorkspaceQuotaItem[];
    }>(res, {
      data: {
        quota: filteredQuota
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get namespace quota error' });
  }
}
