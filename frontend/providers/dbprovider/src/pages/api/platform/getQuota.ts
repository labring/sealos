import { authAppToken, verifyJwt } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { cpuFormatToM, memoryFormatToMi } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

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

    const { BILLING_URL, BILLING_SECRET } = process.env;
    if (!BILLING_SECRET || !BILLING_URL) {
      throw new Error('BILLING_SECRET and BILLING_URL needs to be configured!');
    }

    const session = await verifyJwt<{
      userId: string;
      userUid: string;
      workspaceId: string;
    }>(desktopToken, BILLING_SECRET).catch(() => null);
    if (!session) {
      return jsonRes(res, {
        code: 401,
        error: 'Unauthorized'
      });
    }

    const quotaRes = await fetch(`${BILLING_URL}/account/v1alpha1/workspace/get-resource-quota`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${desktopToken}`,
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
      }
      // DBProvider has no gpu requirements.
    ];

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
